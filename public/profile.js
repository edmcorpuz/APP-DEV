async function loadProfile() {
  const loading = document.querySelector('#loading');
  const message = document.querySelector('#form-status');
  try {
    const response = await fetch('/api/me');
    if (response.status === 401) {
      window.location.replace('/login.html');
      return;
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Could not load your profile.');

    // textContent displays user input as text, never as HTML.
    document.querySelector('#username').textContent = result.user.username;
    document.querySelector('#email').textContent = result.user.email;
    document.querySelector('#bio').textContent = result.user.bio || 'No bio added yet.';
    document.querySelector('#profile').hidden = false;
  } catch (error) {
    message.textContent = `${error.message} Please try refreshing the page.`;
    message.hidden = false;
  } finally {
    loading.hidden = true;
  }
}

loadProfile();
