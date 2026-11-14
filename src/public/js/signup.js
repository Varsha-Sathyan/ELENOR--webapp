
document.querySelectorAll(".toggle-password").forEach(button => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.target);
  
      if (!input) return;
  
      const show = input.type === "password";
      input.type = show ? "text" : "password";
  
      button.setAttribute(
        "aria-label",
        show ? "Hide password" : "Show password"
      );
  
      button.setAttribute("aria-pressed", String(show));
    });
  });
  
const form = document.getElementById('signupForm');
const password = document.getElementById('password');
const confirmation = document.getElementById('confirmPassword');
const fullName = document.getElementById('fullName');
const email = document.getElementById('email');
form.addEventListener('input', event => {
  event.target.setCustomValidity?.('');
  if (event.target === password) confirmation.setCustomValidity('');
});
form.addEventListener('submit', event => {
  if (!fullName.value.trim()) fullName.setCustomValidity('Enter your full name.');
  if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.value.trim())) email.setCustomValidity('Enter a valid email address.');
  if (!password.value.trim() || new TextEncoder().encode(password.value).length > 72) {
    password.setCustomValidity('Use a password of up to 72 bytes that is not only spaces.');
  }
  if (password.value !== confirmation.value) confirmation.setCustomValidity('Passwords do not match.');
  if (!form.reportValidity()) event.preventDefault();
});
