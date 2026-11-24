const form = document.querySelector('[data-code-deadline]');
if (form) {
 const deadline = Number(form.dataset.codeDeadline);
 function tick() {
  const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  document.querySelector('[data-code-countdown]').textContent = seconds ? 'Code expires in ' + String(Math.floor(seconds / 60)).padStart(2,'0') + ':' + String(seconds % 60).padStart(2,'0') : 'Your code has expired. Request a new code.';
  document.querySelector('[data-code-resend]').hidden = seconds > 0;
  form.querySelector('button').disabled = seconds === 0;
 }
 tick(); setInterval(tick, 1000);
}