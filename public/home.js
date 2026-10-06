const button = document.querySelector('#logout');
const status = document.querySelector('#form-status');

button.addEventListener('click', async () => {
  button.disabled = true;
  status.hidden = true;
  try {
    const response = await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    const result = await response.json();
    if (response.ok) {
      window.location.replace('/login.html');
      return;
    }
    status.textContent = `${response.status} · ${result.message}`;
  } catch {
    status.textContent = 'Connection error · Could not log out. Please try again.';
  }
  status.dataset.kind = 'error';
  status.hidden = false;
  button.disabled = false;
});
