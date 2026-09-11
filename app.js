const STORAGE_KEY = 'taskflow.tasks.v1';
const NEW_CATEGORY_VALUE = '__new__';
const ALLOWED_RICH_TAGS = new Set(['B', 'STRONG', 'S', 'STRIKE', 'U', 'EM', 'I', 'UL', 'OL', 'LI', 'BR', 'DIV', 'P']);

const state = {
  tasks: loadTasks(),
  filter: 'all',
  category: 'all',
  editingId: null,
  pendingDeleteId: null,
  allSelected: false,
  categoryOptionsSignature: '',
};

const elements = {
  form: document.querySelector('#taskForm'),
  input: document.querySelector('#taskInput'),
  categoryInput: document.querySelector('#categoryInput'),
  categorySelect: document.querySelector('#categorySelect'),
  categoryFilter: document.querySelector('#groupFilter'),
  filterButtons: [...document.querySelectorAll('.filter-button')],
  toolbarButtons: [...document.querySelectorAll('[data-command]')],
  bodyEditor: document.querySelector('#bodyEditor'),
  message: document.querySelector('#formMessage'),
  list: document.querySelector('#taskList'),
  emptyState: document.querySelector('#emptyState'),
  emptyTitle: document.querySelector('#emptyTitle'),
  emptyText: document.querySelector('#emptyText'),
  total: document.querySelector('#totalCount'),
  active: document.querySelector('#activeCount'),
  completed: document.querySelector('#completedCount'),
  clearCompleted: document.querySelector('#clearCompleted'),
  deleteAll: document.querySelector('#deleteAll'),
  selectAll: document.querySelector('#selectAll'),
  deleteTaskButton: document.querySelector('#deleteTaskButton'),
  deleteModal: document.querySelector('#deleteModal'),
  cancelDelete: document.querySelector('#cancelDelete'),
  confirmDelete: document.querySelector('#confirmDelete'),
  deleteTitle: document.querySelector('#deleteTitle'),
  deleteDescription: document.querySelector('#deleteDescription'),
  taskModal: document.querySelector('#taskModal'),
  cancelTask: document.querySelector('#cancelTask'),
  cancelTaskBottom: document.querySelector('#cancelTaskBottom'),
  modalTitle: document.querySelector('#taskModalTitle'),
  modalKicker: document.querySelector('#modalKicker'),
  submitTaskButton: document.querySelector('#submitTaskButton'),
  today: document.querySelector('#todayLabel'),
  calendarDay: document.querySelector('#calendarDay'),
  focusTask: document.querySelector('#focusTask'),
};

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved.map((task) => ({
      ...task,
      title: String(task.title || '').trim(),
      category: String(task.category || 'General').trim() || 'General',
      body: sanitizeRichText(task.body || ''),
    })).filter((task) => task.title) : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function createTask(title, category, body) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    title: title.trim(),
    category: category.trim() || 'General',
    body: sanitizeRichText(body || ''),
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

function getVisibleTasks() {
  return state.tasks.filter((task) => {
    if (state.filter === 'active' && task.completed) return false;
    if (state.filter === 'completed' && !task.completed) return false;
    return state.category === 'all' || task.category === state.category;
  });
}

function setMessage(message = '') {
  elements.message.textContent = message;
  elements.input.classList.toggle('invalid', Boolean(message));
}

function focusInputSoon() {
  const focus = () => elements.input.focus();
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(focus);
  else focus();
}

function renderTask(task) {
  return `
    <li class="task-item ${task.completed ? 'completed' : ''} ${state.allSelected ? 'selected' : ''}" data-id="${task.id}">
      <input class="task-check" type="checkbox" aria-label="Mark ${escapeHtml(task.title)} as done" ${task.completed ? 'checked' : ''}>
      <div class="task-copy"><span class="task-title">${escapeHtml(task.title)}</span></div>
      <div class="task-actions">
        <button class="icon-button edit-task" type="button" title="Open task details">Edit</button>
        <button class="icon-button delete" type="button" title="Delete task">Delete</button>
      </div>
    </li>`;
}

function renderCategoryFilter() {
  const categories = [...new Set(state.tasks.map((task) => task.category))].sort((a, b) => a.localeCompare(b));
  if (state.category !== 'all' && !categories.includes(state.category)) state.category = 'all';
  const signature = categories.join('\u0000');
  if (signature !== state.categoryOptionsSignature) {
    const categoryOptions = categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
    elements.categoryFilter.innerHTML = '<option value="all">All categories</option>' + categoryOptions;
    elements.categorySelect.innerHTML = '<option value="">Choose an existing category</option>'
      + categoryOptions + `<option value="${NEW_CATEGORY_VALUE}">＋ Create new category</option>`;
    state.categoryOptionsSignature = signature;
  }
  elements.categoryFilter.value = state.category;
}

function setCategoryPicker(category = '') {
  const isCreating = category === NEW_CATEGORY_VALUE;
  const isExisting = !isCreating && category && [...elements.categorySelect.options].some((option) => option.value === category);
  elements.categorySelect.value = isCreating ? NEW_CATEGORY_VALUE : (isExisting ? category : '');
  elements.categoryInput.value = isCreating ? '' : '';
  elements.categoryInput.classList.toggle('hidden', !isCreating);
}

function renderSelectionControls() {
  const hasTasks = state.tasks.length > 0;
  if (!hasTasks) state.allSelected = false;
  elements.selectAll.disabled = !hasTasks;
  elements.selectAll.textContent = state.allSelected ? 'Deselect all' : 'Select all';
  elements.selectAll.setAttribute('aria-pressed', String(state.allSelected));
  elements.deleteAll.classList.toggle('hidden', !state.allSelected);
  elements.deleteAll.disabled = !state.allSelected;
}

function render() {
  const visibleTasks = getVisibleTasks();
  const completed = state.tasks.reduce((count, task) => count + (task.completed ? 1 : 0), 0);
  elements.total.textContent = state.tasks.length;
  elements.active.textContent = state.tasks.length - completed;
  elements.completed.textContent = completed;
  renderCategoryFilter();
  renderSelectionControls();

  const groups = [...visibleTasks.reduce((map, task) => {
    if (!map.has(task.category)) map.set(task.category, []);
    map.get(task.category).push(task);
    return map;
  }, new Map())].sort(([a], [b]) => a.localeCompare(b));

  elements.list.innerHTML = groups.map(([category, tasks]) => `
    <li class="category-group">
      <div class="category-heading"><span class="category-name">${escapeHtml(category)}</span><span class="category-count">${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}</span></div>
      <ul class="group-list">${tasks.map(renderTask).join('')}</ul>
    </li>
  `).join('');

  const hasTasks = visibleTasks.length > 0;
  elements.emptyState.classList.toggle('hidden', hasTasks);
  if (state.tasks.length === 0) {
    elements.emptyTitle.textContent = 'Nothing here yet';
    elements.emptyText.textContent = 'Click “New task” to add your first task.';
  } else if (state.category !== 'all') {
    elements.emptyTitle.textContent = 'No tasks in this category';
    elements.emptyText.textContent = 'Choose another category or add a new task.';
  } else if (state.filter === 'active') {
    elements.emptyTitle.textContent = 'All caught up';
    elements.emptyText.textContent = 'There are no active tasks right now.';
  } else if (state.filter === 'completed') {
    elements.emptyTitle.textContent = 'No completed tasks';
    elements.emptyText.textContent = 'Finish a task and it will appear here.';
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

function sanitizeRichText(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  const allowed = ALLOWED_RICH_TAGS;
  const clean = (parent) => [...parent.childNodes].forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (!allowed.has(node.tagName)) {
      node.replaceWith(document.createTextNode(node.textContent || ''));
      return;
    }
    [...node.attributes].forEach((attribute) => node.removeAttribute(attribute.name));
    clean(node);
  });
  clean(template.content);
  return template.innerHTML;
}

function transformBodyText(transform) {
  const selection = window.getSelection();
  const hasSelection = selection && selection.rangeCount && !selection.isCollapsed
    && elements.bodyEditor.contains(selection.anchorNode);
  if (hasSelection) {
    document.execCommand('insertText', false, transform(selection.toString()));
    return;
  }
  const walker = document.createTreeWalker(elements.bodyEditor, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => { node.nodeValue = transform(node.nodeValue); });
}

function applyEditorCommand(command) {
  elements.bodyEditor.focus();
  if (command === 'uppercase') return transformBodyText((text) => text.toUpperCase());
  if (command === 'lowercase') return transformBodyText((text) => text.toLowerCase());
  document.execCommand(command, false, null);
}

function addTask(event) {
  event.preventDefault();
  const title = elements.input.value.trim();
  const selectedCategory = elements.categorySelect.value;
  const category = selectedCategory === NEW_CATEGORY_VALUE
    ? elements.categoryInput.value.trim()
    : selectedCategory;
  const body = sanitizeRichText(elements.bodyEditor.innerHTML);
  if (!title) {
    setMessage('Please enter a task name.');
    elements.input.focus();
    return;
  }
  if (state.editingId) {
    const task = state.tasks.find((item) => item.id === state.editingId);
    if (task) {
      task.title = title;
      task.category = category;
      task.body = body;
    }
  } else {
    state.tasks.unshift(createTask(title, category, body));
  }
  saveTasks();
  elements.form.reset();
  elements.bodyEditor.innerHTML = '';
  setMessage();
  closeTaskModal();
  state.editingId = null;
  state.allSelected = false;
  state.filter = 'all';
  state.category = 'all';
  elements.filterButtons.forEach((button) => button.classList.toggle('active', button.dataset.filter === 'all'));
  render();
}

function toggleTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  render();
}

function requestDelete(id) {
  if (id) {
    state.pendingDeleteId = id;
    elements.deleteTitle.textContent = 'Are you sure you want to delete this task?';
    elements.deleteDescription.textContent = 'This task and its details will be permanently removed.';
  } else {
    if (!state.allSelected || state.tasks.length === 0) return;
    state.pendingDeleteId = null;
    elements.deleteTitle.textContent = 'Are you sure you want to delete all selected tasks?';
    elements.deleteDescription.textContent = 'Every selected task and its details will be permanently removed.';
  }
  closeTaskModal();
  elements.confirmDelete.disabled = false;
  elements.confirmDelete.textContent = 'Yes, delete';
  elements.deleteModal.classList.remove('hidden');
  elements.confirmDelete.focus();
}

function openTaskModal() {
  state.editingId = null;
  elements.form.reset();
  elements.bodyEditor.innerHTML = '';
  setCategoryPicker();
  elements.modalKicker.textContent = 'NEW TASK';
  elements.modalTitle.textContent = 'What needs to be done?';
  elements.submitTaskButton.textContent = 'Add task';
  elements.deleteTaskButton.classList.add('hidden');
  setMessage();
  elements.taskModal.classList.remove('hidden');
  focusInputSoon();
}

function openTaskEditor(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  state.editingId = id;
  elements.input.value = task.title;
  setCategoryPicker(task.category);
  elements.bodyEditor.innerHTML = sanitizeRichText(task.body || '');
  elements.modalKicker.textContent = 'EDIT TASK';
  elements.modalTitle.textContent = 'Edit task details';
  elements.submitTaskButton.textContent = 'Save changes';
  elements.deleteTaskButton.classList.remove('hidden');
  setMessage();
  elements.taskModal.classList.remove('hidden');
  focusInputSoon();
}

function closeTaskModal() {
  elements.taskModal.classList.add('hidden');
}

function closeDeleteModal() {
  elements.deleteModal.classList.add('hidden');
  state.pendingDeleteId = null;
}

function confirmDeletion() {
  const taskId = state.pendingDeleteId;
  elements.confirmDelete.disabled = true;
  elements.confirmDelete.textContent = 'Deleting…';
  setTimeout(() => {
    if (taskId) {
      state.tasks = state.tasks.filter((task) => task.id !== taskId);
    } else {
      state.tasks = [];
    }
    state.editingId = null;
    state.allSelected = false;
    saveTasks();
    closeDeleteModal();
    elements.confirmDelete.disabled = false;
    elements.confirmDelete.textContent = 'Yes, delete';
    render();
  }, taskId ? 250 : 450);
}

function clearCompleted() {
  state.tasks = state.tasks.filter((task) => !task.completed);
  state.allSelected = false;
  saveTasks();
  render();
}

function setupEvents() {
  elements.form.addEventListener('submit', addTask);
  elements.focusTask.addEventListener('click', openTaskModal);
  elements.cancelTask.addEventListener('click', closeTaskModal);
  elements.cancelTaskBottom.addEventListener('click', closeTaskModal);
  elements.deleteTaskButton.addEventListener('click', () => requestDelete(state.editingId));
  elements.taskModal.addEventListener('click', (event) => { if (event.target === elements.taskModal) closeTaskModal(); });
  elements.input.addEventListener('input', () => { if (elements.input.value.trim()) setMessage(); });
  elements.categoryFilter.addEventListener('change', (event) => { state.category = event.target.value; render(); });
  elements.categorySelect.addEventListener('change', (event) => {
    setCategoryPicker(event.target.value);
    if (event.target.value === NEW_CATEGORY_VALUE) elements.categoryInput.focus();
  });
  elements.toolbarButtons.forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => applyEditorCommand(button.dataset.command));
  });
  elements.list.addEventListener('change', (event) => {
    if (event.target.classList.contains('task-check')) toggleTask(event.target.closest('.task-item').dataset.id);
  });
  elements.list.addEventListener('click', (event) => {
    const item = event.target.closest('.task-item');
    if (!item) return;
    const id = item.dataset.id;
    if (event.target.closest('.delete')) return requestDelete(id);
    if (event.target.closest('.edit-task')) return openTaskEditor(id);
    if (event.target.closest('button, input')) return;
    openTaskEditor(id);
  });
  elements.filterButtons.forEach((button) => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    elements.filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    render();
  }));
  elements.clearCompleted.addEventListener('click', clearCompleted);
  elements.selectAll.addEventListener('click', () => {
    if (state.tasks.length === 0) return;
    state.allSelected = !state.allSelected;
    render();
  });
  elements.deleteAll.addEventListener('click', () => requestDelete());
  elements.cancelDelete.addEventListener('click', closeDeleteModal);
  elements.confirmDelete.addEventListener('click', confirmDeletion);
  elements.deleteModal.addEventListener('click', (event) => { if (event.target === elements.deleteModal) closeDeleteModal(); });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!elements.taskModal.classList.contains('hidden')) closeTaskModal();
    if (!elements.deleteModal.classList.contains('hidden')) closeDeleteModal();
  });
}

function showToday() {
  const now = new Date();
  elements.today.textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(now);
  elements.calendarDay.textContent = new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(now);
}

setupEvents();
showToday();
render();
