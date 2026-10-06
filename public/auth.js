const form = document.querySelector('[data-auth]');
const status = document.querySelector('#form-status');
const submitButton = form.querySelector('button[type="submit"]');
const buttonLabel = submitButton.textContent;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;
  status.hidden = true;
  submitButton.disabled = true;
  submitButton.textContent = 'Please wait…';
  form.setAttribute('aria-busy', 'true');

  // Send JSON in the POST body. Never put credentials in a URL.
  const body = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch(`/api/${form.dataset.auth}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    const result = await response.json();
    status.textContent = `${response.status} · ${result.message}`;
    status.dataset.kind = response.ok ? 'success' : 'error';
    status.hidden = false;
    if (response.ok) {
      window.location.assign('/home.html');
      return;
    }
  } catch {
    status.textContent = 'Connection error · Could not reach the server. Please try again.';
    status.dataset.kind = 'error';
    status.hidden = false;
  }
  submitButton.disabled = false;
  submitButton.textContent = buttonLabel;
  form.removeAttribute('aria-busy');
});
