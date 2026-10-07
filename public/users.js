async function loadUsers() {
  const loading = document.querySelector('#loading');
  const message = document.querySelector('#form-status');
  const list = document.querySelector('#user-list');
  try {
    const response = await fetch('/api/users');
    if (response.status === 401) {
      window.location.replace('/login.html');
      return;
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Could not load users.');

    for (const user of result.users) {
      const item = document.createElement('li');
      const name = document.createElement('h2');
      const email = document.createElement('p');
      const bio = document.createElement('p');
      // Never insert account details with innerHTML.
      name.textContent = user.username;
      email.textContent = user.email;
      bio.textContent = user.bio || 'No bio added yet.';
      item.append(name, email, bio);
      list.append(item);
    }
    list.hidden = false;
  } catch (error) {
    message.textContent = `${error.message} Please try refreshing the page.`;
    message.hidden = false;
  } finally {
    loading.hidden = true;
  }
}

loadUsers();
