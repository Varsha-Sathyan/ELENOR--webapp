const confirmation = document.getElementById('access-confirmation');
const confirmButton = confirmation.querySelector('.access-confirmation-yes');
const description = confirmation.querySelector('#access-confirmation-description');
let pending = null;
let approvedForm = null;
document.querySelectorAll('[data-confirm-access]').forEach(form => {
  form.addEventListener('submit', event => {
    if (approvedForm === form) return;
    event.preventDefault();
    const submitter = event.submitter || form.querySelector('button[name="action"]');
    const action = submitter.value === 'unblock' ? 'unblock' : 'block';
    pending = { form, submitter };
    description.textContent = `Do you want to ${action} the customer?`;
    confirmButton.textContent = action === 'block' ? 'Yes, Block' : 'Yes, Unblock';
    confirmButton.disabled = false;
    confirmation.showModal();
  });
});
confirmButton.addEventListener('click', () => {
  if (!pending) return;
  const { form, submitter } = pending;
  approvedForm = form;
  confirmButton.disabled = true;
  confirmation.close();
  form.requestSubmit(submitter);
  approvedForm = null;
});
confirmation.querySelector('.access-confirmation-close').addEventListener('click', () => confirmation.close());
confirmation.addEventListener('close', () => { pending = null; });
confirmation.addEventListener('click', event => {
  if (event.target !== confirmation) return;
  const bounds = confirmation.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) confirmation.close();
});
