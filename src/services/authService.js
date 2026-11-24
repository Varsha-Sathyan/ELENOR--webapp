const crypto = require('node:crypto');
const sendOtpEmail = require('./otpEmail');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

const saveSession = req => new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));

async function signIn(req, user) {
  const cart = req.session.cart;
  await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  req.session.userId = user.id;
  req.session.sessionVersion = user.sessionVersion ?? 0;
  if (cart) req.session.cart = cart;
  await saveSession(req);
}

async function issueOtp(pending) {
  const otp = String(crypto.randomInt(1000, 10000));
  await sendOtpEmail(pending.email, otp);
  pending.otpHash = digest(otp);
  pending.expiresAt = Date.now() + 5 * 60 * 1000;
  pending.resendAfter = pending.expiresAt;
}
module.exports = { digest, saveSession, signIn, issueOtp };
