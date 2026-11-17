
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
  
    // Show / hide password
    togglePassword.addEventListener("click", () => {
      const isHidden = password.type === "password";
  
      password.type = isHidden ? "text" : "password";
  
      togglePassword.setAttribute(
        "aria-label",
        isHidden ? "Hide password" : "Show password"
      );
  
      togglePassword.setAttribute(
        "aria-pressed",
        String(isHidden)
      );
    });
  
    loginForm.addEventListener('input', event => event.target.setCustomValidity?.(''));
    loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!/^[^\s@.]+(?:\.[^\s@.]+)*@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.value.trim())) email.setCustomValidity('Enter a valid email address.');
      if (new TextEncoder().encode(password.value).length > 72) password.setCustomValidity('Enter a password of up to 72 bytes.');
      if (!loginForm.reportValidity() || loginForm.getAttribute('aria-busy') === 'true') return;

      let errorBox = loginForm.parentElement.querySelector('.error-message');
      if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.className = 'error-message';
        errorBox.setAttribute('role', 'alert');
        loginForm.before(errorBox);
      }
      errorBox.hidden = true;
      loginForm.setAttribute('aria-busy', 'true');
      try {
        const response = await fetch(loginForm.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new URLSearchParams(new FormData(loginForm))
        });
        if (response.redirected && new URL(response.url).pathname === '/home') {
          window.location.replace('/home');
          return;
        }
        const result = await response.json();
        if (response.ok && result.signedIn) {
          window.location.replace('/home');
          return;
        }
        errorBox.textContent = result.error || 'Sign-in failed. Please try again.';
      } catch {
        errorBox.textContent = 'Sign-in failed. Please try again.';
      } finally {
        loginForm.removeAttribute('aria-busy');
      }
      errorBox.hidden = false;
    });
});
