
const namePattern = /^\p{L}[\p{L}\p{M}]*(?: +\p{L}[\p{L}\p{M}]*)*$/u;

function validateAddress(body) {
  const limits = { label: 40, fullName: 120, phone: 30, line1: 160, line2: 160, city: 80, region: 80, postalCode: 20, country: 80 };
  const address = {};
  for (const [field, limit] of Object.entries(limits)) {
    const value = body[field];
    if (typeof value !== 'string' || value.trim().length > limit || /[\x00-\x1f\x7f]/.test(value) || (field !== 'line2' && !value.trim())) return null;
    address[field] = value.trim();
  }
  if (!namePattern.test(address.fullName) || !/^[+\d\s().-]{7,30}$/.test(address.phone) || !/^[\p{L}\p{N} -]{2,20}$/u.test(address.postalCode)) return null;
  return address;
}
module.exports = { namePattern, validateAddress };
