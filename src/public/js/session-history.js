// A browser can restore a page from history without making a new request.
// Reopen it with GET so the server can check the current session.
const sessionPage = document.currentScript.dataset.sessionPage;

// Keep the form out of the history entry used to start Google sign-in.
document.querySelector('.google-btn[href^="/auth/google"]')?.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
      event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.location.replace(event.currentTarget.href);
});

window.addEventListener('pageshow', event => {
  const navigation = performance.getEntriesByType('navigation')[0];
  if (event.persisted || navigation?.type === 'back_forward') {
    window.location.replace(sessionPage || window.location.pathname);
  }
});
