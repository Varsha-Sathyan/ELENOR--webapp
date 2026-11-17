
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
const referralInput = document.getElementById('referralId');
const googleSignup = document.querySelector('.google-btn[href^="/auth/google/signup"]');
referralInput?.addEventListener('input', () => {
  if (!googleSignup) return;
  const url = new URL(googleSignup.href);
  const code = referralInput.value.trim();
  if (code) url.searchParams.set('ref', code);
  else url.searchParams.delete('ref');
  googleSignup.href = url.href;
});
form.addEventListener('input', event => {
  event.target.setCustomValidity?.('');
  if (event.target === password) confirmation.setCustomValidity('');
});
form.addEventListener('submit', event => {
  if (!/^\p{L}[\p{L}\p{M}]*(?: +\p{L}[\p{L}\p{M}]*)*$/u.test(fullName.value.trim())) {
    fullName.setCustomValidity('Enter your full name using letters and spaces only.');
  }
  if (!/^[^\s@.]+(?:\.[^\s@.]+)*@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.value.trim())) email.setCustomValidity('Enter a valid email address.');
  if (!password.value.trim() || new TextEncoder().encode(password.value).length > 72) {
    password.setCustomValidity('Use a password of up to 72 bytes that is not only spaces.');
  }
  if (password.value !== confirmation.value) confirmation.setCustomValidity('Passwords do not match.');
  if (!form.reportValidity()) event.preventDefault();
});
