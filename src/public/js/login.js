
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
    loginForm.addEventListener('submit', event => {
      if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.value.trim())) email.setCustomValidity('Enter a valid email address.');
      if (new TextEncoder().encode(password.value).length > 72) password.setCustomValidity('Enter a password of up to 72 bytes.');
      if (!loginForm.reportValidity()) event.preventDefault();
    });
});
