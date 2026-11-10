
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
  
  const form = document.getElementById("signupForm");
  
  if (form) {
    form.addEventListener("submit", event => {
      const error = document.getElementById("formError");
  
      if (error) error.textContent = "";
  
      if (!form.checkValidity()) {
        event.preventDefault();
  
        if (error) {
          error.textContent =
            "Please complete all required fields with valid information.";
        }
  
        form.reportValidity();
        return;
      }
  
      const password = document.getElementById("password");
      const confirmPassword = document.getElementById("confirmPassword");
  
      if (password && confirmPassword &&
          password.value !== confirmPassword.value) {
        event.preventDefault();
  
        if (error) {
          error.textContent = "Passwords do not match.";
        }
  
        confirmPassword.focus();
      }
    });
  }
  