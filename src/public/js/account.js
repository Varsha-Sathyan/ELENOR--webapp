document.querySelectorAll('[data-copy],[data-copy-referral]').forEach(button => button.addEventListener('click', async () => {
  const value = button.dataset.copy || `${location.origin}/signup?ref=${encodeURIComponent(button.dataset.copyReferral)}`;
  const status = document.getElementById('copy-status');
  try { await navigator.clipboard.writeText(value); status.textContent = 'Copied to clipboard.'; }
  catch { status.textContent = `Copy this: ${value}`; }
}));
const photoInput = document.getElementById('photo-input');
let processingPhoto = false;
photoInput?.addEventListener('change', async () => {
  const file = photoInput.files[0];
  if (!file) return;
  const error = document.getElementById('photo-error');
  const hidden = document.getElementById('photo-data');
  error.textContent = ''; hidden.value = '';
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { error.textContent = 'Choose a JPEG, PNG, or WebP image smaller than 5 MB.'; return; }
  processingPhoto = true;
  try {
    const image = await createImageBitmap(file);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'); const size = Math.min(image.width,image.height);
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,256,256);
    ctx.drawImage(image,(image.width-size)/2,(image.height-size)/2,size,size,0,0,256,256);
    image.close(); hidden.value = canvas.toDataURL('image/jpeg',.85);
    const preview = document.createElement('img'); preview.src = hidden.value; preview.alt = 'New profile photo preview';
    document.getElementById('avatar-preview').replaceChildren(preview);
  } catch { error.textContent = 'This photo could not be read. Please choose another image.'; }
  finally { processingPhoto = false; }
});
document.getElementById('details-form')?.addEventListener('submit', event => {
  if (processingPhoto) { event.preventDefault(); document.getElementById('photo-error').textContent = 'Please wait for your photo to finish processing.'; }
});
