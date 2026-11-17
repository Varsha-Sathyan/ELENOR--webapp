const User = require('../models/User');

function referralCode(id) {
  return 'ELENOR-' + String(id).toUpperCase();
}

async function resolveReferral(value, email) {
  if (value === undefined || (typeof value === 'string' && !value.trim())) return {};
  if (typeof value !== 'string' || value.length > 100) return null;
  const match = /^ELENOR-([0-9A-F]{24}|[0-9A-F]{8})$/i.exec(value.trim());
  if (!match) return null;
  const id = match[1].toLowerCase();
  let referrer;
  if (id.length === 24) {
    referrer = await User.findById(id).select('email emailVerified isBlocked');
  } else {
    // Accept previously shared short codes when they identify exactly one customer.
    const matches = await User.find({
      $expr: { $eq: [{ $substrBytes: [{ $toString: '$_id' }, 16, 8] }, id] }
    }).select('email emailVerified isBlocked').limit(2);
    if (matches.length === 1) referrer = matches[0];
  }
  if (!referrer?.emailVerified || referrer.isBlocked || referrer.email === email) return null;
  return { referralId: referralCode(referrer.id), referredBy: referrer.id };
}

module.exports = { referralCode, resolveReferral };
