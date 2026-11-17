function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  const [local, domain, extra] = email.split('@');
  if (!domain || extra !== undefined || email.length > 254 || local.length > 64) return null;
  if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(local)) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)) return null;
  return email;
}

function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && /\S/.test(value) && Buffer.byteLength(value) <= 72;
}

module.exports = { normalizeEmail, validPassword };
