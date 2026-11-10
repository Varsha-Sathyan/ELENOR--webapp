
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
  
    // Form validation
    loginForm.addEventListener("submit", (event) => {
      const emailValue = email.value.trim();
      const passwordValue = password.value;
  
      if (!emailValue || !passwordValue) {
        event.preventDefault();
        alert("Please enter your email and password.");
        return;
      }
  
      if (!email.validity.valid) {
        event.preventDefault();
        alert("Please enter a valid email address.");
        return;
      }
  
      // The Express backend handles authentication.
    });
  });
  