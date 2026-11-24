const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const sendCode = require('../services/otpEmail');
const { normalizeEmail, validPassword } = require('../services/authValidation');
const { digest } = require('../services/authService');
const requests = new Map();


exports.showForgotPassword = (req, res) => res.render('auth/recovery', { step: 'request' });
exports.showResetPassword = (req, res) => req.session.passwordRecovery ? res.render('auth/recovery', { step: 'reset' }) : res.redirect('/forgot-password');

exports.requestReset = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (req.session.passwordRecovery?.expiresAt > Date.now()) return res.redirect(303, '/reset-password');
    if (!email) return res.status(400).render('auth/recovery', { step: 'request', error: 'Enter a valid email address.' });
    const now = Date.now();
    for (const [key, item] of requests) if (item.until < now) requests.delete(key);
    const limit = requests.get(req.ip) || { count: 0, until: now + 15 * 60 * 1000 };
    if (limit.count >= 5) return res.status(429).render('auth/recovery', { step: 'request', error: 'Too many requests. Please try again in 15 minutes.' });
    limit.count++;
    requests.set(req.ip, limit);
    const code = String(crypto.randomInt(1000, 10000));
    const hash = digest(code);
    const user = await User.findOneAndUpdate({
      email, isBlocked: { $ne: true }, emailVerified: true,
      $or: [{ 'passwordReset.sentAt': { $exists: false } }, { 'passwordReset.sentAt': { $lte: new Date(now - 5 * 60 * 1000) } }]
    }, {
      $set: { passwordReset: { hash, sentAt: new Date(now), expiresAt: new Date(now + 5 * 60 * 1000), attempts: 0 } }
    }, { new: true });
    if (user) {
      try {
        await sendCode(email, code, 'password reset');
      } catch {
        await User.updateOne({ _id: user.id, 'passwordReset.hash': hash }, { $unset: { passwordReset: 1 } });
        console.error('Password reset email delivery failed.');
        return res.status(503).render('auth/recovery', { step: 'request', error: 'We could not send the reset email. Please try again.' });
      }
    }
    // Reuse the real expiry when an existing code prevents another send.
    const existing = user ? null : await User.findOne({ email, isBlocked: { $ne: true }, emailVerified: true }).select('+passwordReset');
    req.session.passwordRecovery = { email, expiresAt: existing?.passwordReset?.expiresAt?.getTime() || now + 5 * 60 * 1000 };
    req.session.save(error => error ? next(error) : res.redirect(303, '/reset-password'));
  } catch (error) { next(error); }
};
exports.resetPassword = async (req, res, next) => {
  try {
    const { otp, newPassword, confirmPassword } = req.body;
    const email = req.session.passwordRecovery?.email;
    if (!email) return res.redirect(303, '/forgot-password');
    const fail = error => res.status(400).render('auth/recovery', { step: 'reset', error });
    if (!email || typeof otp !== 'string' || !/^\d{4}$/.test(otp)) return fail('Enter the four-digit reset code.');
    if (!validPassword(newPassword)) return fail('Use at least 8 characters and at most 72 bytes, including a non-space character.');
    if (newPassword !== confirmPassword) return fail('Passwords do not match.');
    const user = await User.findOneAndUpdate({
      email, isBlocked: { $ne: true }, emailVerified: true,
      'passwordReset.expiresAt': { $gt: new Date() },
      'passwordReset.attempts': { $lt: 5 }
    }, { $inc: { 'passwordReset.attempts': 1 } }, { new: true }).select('+passwordReset');
    if (!user || !crypto.timingSafeEqual(Buffer.from(digest(otp)), Buffer.from(user.passwordReset.hash))) {
      return fail('The code is incorrect, expired, or has reached its attempt limit. Request a new code.');
    }
    const password = await bcrypt.hash(newPassword, 12);
    const result = await User.updateOne({
      _id: user.id, isBlocked: { $ne: true },
      'passwordReset.hash': user.passwordReset.hash,
      'passwordReset.expiresAt': { $gt: new Date() },
      'passwordReset.attempts': { $lte: 5 }
    }, { $set: { password }, $unset: { passwordReset: 1, emailChange: 1 }, $inc: { sessionVersion: 1 } });
    if (!result.modifiedCount) return fail('This code has already been used or expired. Request a new code.');
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie('elenor.sid');
      res.redirect(303, '/login?reset=1');
    });
  } catch (error) { next(error); }
};
