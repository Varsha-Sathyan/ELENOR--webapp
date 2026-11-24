document.querySelectorAll('[data-confirm-access]').forEach(form => {
 form.addEventListener('submit', event => {
  const action = event.submitter?.value === 'unblock' ? 'unblock' : 'block';
  if (!window.confirm('Are you sure you want to ' + action + ' ' + (form.dataset.userName || 'this user') + '?')) event.preventDefault();
 });
});