const { namePattern, validateAddress } = require('../services/addressService');
const crypto = require('node:crypto');
const User = require('../models/User');
const sendCode = require('../services/otpEmail');
const { normalizeEmail } = require('../services/authValidation');
const { digest } = require('../services/authService');

exports.requestEmailChange = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const fail = error => res.status(400).render('user/editProfile', { error });
    if (!email || email === req.account.email) return fail('Enter a different valid email address.');
    if (await User.exists({ email })) return fail('This email address is already registered.');
    const oldCode = String(crypto.randomInt(1000, 10000));
    const newCode = String(crypto.randomInt(1000, 10000));
    const pending = {
      email, oldHash: digest(oldCode), newHash: digest(newCode),
      sentAt: new Date(), expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0, version: req.session.sessionVersion ?? 0
    };
    const result = await User.updateOne({
      _id: req.account.id, isBlocked: { $ne: true },
      $or: [{ 'emailChange.sentAt': { $exists: false } }, { 'emailChange.sentAt': { $lte: new Date(Date.now() - 5 * 60 * 1000) } }]
    }, { $set: { emailChange: pending } });
    if (!result.modifiedCount) return fail('Please wait until the current codes expire before requesting another email change.');
    try {
      await sendCode(req.account.email, oldCode, 'email change approval');
      await sendCode(email, newCode, 'new email verification');
    } catch {
      await User.updateOne({ _id: req.account.id, 'emailChange.newHash': pending.newHash }, { $unset: { emailChange: 1 } });
      return res.status(503).render('user/editProfile', { error: 'The verification emails could not be sent. Please try again.' });
    }
    res.redirect(303, '/profile/email/verify');
  } catch (error) { next(error); }
};
exports.showEmailVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.account.id).select('+emailChange');
    if (!user.emailChange) return res.redirect('/profile/edit');
    res.render('user/verifyEmail', { newEmail: user.emailChange.email, resetDeadline: user.emailChange.expiresAt.getTime() });
  } catch (error) { next(error); }
};
exports.verifyEmailChange = async (req, res, next) => {
  const pending = await User.findById(req.account.id).select('+emailChange');
  const fail = error => res.status(400).render('user/verifyEmail', { newEmail: pending?.emailChange?.email || null, resetDeadline: pending?.emailChange?.expiresAt?.getTime() || 0, error });
  try {
    const { oldCode, newCode } = req.body;
    if (![oldCode, newCode].every(code => typeof code === 'string' && /^\d{4}$/.test(code))) return fail('Enter both four-digit verification codes.');
    const user = await User.findOneAndUpdate({
      _id: req.account.id, isBlocked: { $ne: true },
      'emailChange.expiresAt': { $gt: new Date() },
      'emailChange.attempts': { $lt: 5 },
      'emailChange.version': req.session.sessionVersion ?? 0
    }, { $inc: { 'emailChange.attempts': 1 } }, { new: true }).select('+emailChange');
    if (!user || user.emailChange.oldHash !== digest(oldCode) || user.emailChange.newHash !== digest(newCode)) {
      return fail('A code is incorrect, expired, or has reached its attempt limit. Request a new email change.');
    }
    const updated = await User.findOneAndUpdate({
      _id: user.id, isBlocked: { $ne: true },
      sessionVersion: (user.sessionVersion ?? 0) === 0 ? { $in: [0, null] } : user.sessionVersion,
      'emailChange.newHash': user.emailChange.newHash,
      'emailChange.expiresAt': { $gt: new Date() },
      'emailChange.attempts': { $lte: 5 }
    }, { $set: { email: user.emailChange.email, emailVerified: true }, $unset: { emailChange: 1, passwordReset: 1 }, $inc: { sessionVersion: 1 } }, { new: true });
    if (!updated) return fail('The request has expired or has already been used.');
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.userId = updated.id;
      req.session.sessionVersion = updated.sessionVersion;
      req.session.profileNotice = 'Your verified email address has been updated.';
      req.session.save(error => error ? next(error) : res.redirect(303, '/profile'));
    });
  } catch (error) {
    if (error.code === 11000) return fail('This email address is already registered. Request a different email address.');
    next(error);
  }
};

exports.listAddresses = (req, res) => res.render('user/addresses');
exports.showNewAddress = (req, res) => res.render('user/addressForm', { address: {}, action: '/profile/addresses' });
exports.showEditAddress = (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(404).render('404', { accountUrl: '/profile', signedIn: true });
  const address = req.account.addresses.id(req.params.id);
  if (!address) return res.status(404).render('404', { accountUrl: '/profile', signedIn: true });
  res.render('user/addressForm', { address, action: '/profile/addresses/' + address.id });
};

exports.saveAddress = async (req, res, next) => {
  try {
    const address = validateAddress(req.body);
    const action = req.params.id ? '/profile/addresses/' + req.params.id : '/profile/addresses';
    if (!address) return res.status(400).render('user/addressForm', { address: req.body, action, error: 'Complete the required fields with a valid name, phone number, and postal code.' });
    if (req.params.id && !/^[a-f0-9]{24}$/i.test(req.params.id)) return res.sendStatus(400);
    const filter = { _id: req.account.id, isBlocked: { $ne: true } };
    let update;
    if (req.params.id) {
      filter['addresses._id'] = req.params.id;
      update = { $set: Object.fromEntries(Object.entries(address).map(([key, value]) => ['addresses.$.' + key, value])) };
    } else {
      update = { $push: { addresses: address } };
    }
    const result = await User.updateOne(filter, update, { runValidators: true });
    if (!result.matchedCount) return res.status(400).render('user/addressForm', { address, action, error: 'This address is no longer available. Reload your address list and try again.' });
    res.redirect(303, '/profile/addresses');
  } catch (error) { next(error); }
};
exports.deleteAddress = async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.sendStatus(400);
    await User.updateOne({ _id: req.account.id, isBlocked: { $ne: true } }, { $pull: { addresses: { _id: req.params.id } } });
    res.redirect(303, '/profile/addresses');
  } catch (error) { next(error); }
};
