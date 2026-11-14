function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@\x00-\x1f\x7f]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(email)) return null;
  return email;
}

function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && /\S/.test(value) && Buffer.byteLength(value) <= 72;
}

module.exports = { normalizeEmail, validPassword };
