// A browser can restore a page from history without making a new request.
// Reopen it with GET so the server can check the current session.
const sessionPage = document.currentScript.dataset.sessionPage;
const isAuthPage = ['/login', '/signup', '/verify-otp', '/admin/login'].includes(sessionPage);
const watchCustomerSession = sessionPage === '/home' || document.currentScript.hasAttribute('data-watch-customer-session');

if (watchCustomerSession) {
  let checking = false;
  async function checkCustomerSession() {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const { status } = await fetch('/auth/session', { cache: 'no-store' });
      if (status === 401 || status === 403) {
        clearInterval(sessionTimer);
        window.location.replace(status === 403 ? '/login?blocked=1' : '/login');
      }
    } catch {
      // Retry on the next check if the connection drops.
    } finally {
      checking = false;
    }
  }
  const sessionTimer = setInterval(checkCustomerSession, 2000);
  document.addEventListener('visibilitychange', checkCustomerSession);
  checkCustomerSession();
}

// Use one Home entry as a buffer. Only handle traversal to that entry,
// so Back still works between Home, products, and the account pages.
if (sessionPage === '/home' && !window.location.hash) {
  const homeUrl = window.location.href;
  function armHomeHistory() {
    if (history.state?.elenorHome === 'current' || window.location.href !== homeUrl) return;
    history.replaceState({ ...history.state, elenorHome: 'previous' }, '', homeUrl);
    history.pushState({ ...history.state, elenorHome: 'current' }, '', homeUrl);
  }

  armHomeHistory();
  window.addEventListener('popstate', event => {
    if (event.state?.elenorHome === 'previous' && window.location.href === homeUrl) {
      armHomeHistory();
    }
  });
}

// Hide the form before the browser takes a history snapshot of the page.
if (isAuthPage) {
  window.addEventListener('pagehide', () => {
    document.body.hidden = true;
  });
}

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
    if (isAuthPage) document.body.hidden = true;
    window.location.replace(sessionPage || window.location.pathname);
  }
});
