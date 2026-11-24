const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { referralCode } = require('../services/referrals');
const { validPassword } = require('../services/authValidation');


exports.showProfile = async (req, res, next) => {
  try {
    const successfulReferrals = await User.countDocuments({ referredBy: req.account.id, emailVerified: true });
    res.render('user/profile', { code: referralCode(req.account.id), successfulReferrals });
  } catch (error) { next(error); }
};
exports.showEditProfile = (req, res) => res.render('user/editProfile');

exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, photo } = req.body;
    const fail = error => res.status(400).render('user/editProfile', {error});
    if (typeof fullName !== 'string' || fullName.trim().length > 120 || !/^\p{L}[\p{L}\p{M}]*(?: +\p{L}[\p{L}\p{M}]*)*$/u.test(fullName.trim())) return fail('Enter your name using letters and spaces only (up to 120 characters).');
    if (typeof phone !== 'string' || phone.length > 30 || (phone && !/^[+\d\s().-]{7,30}$/.test(phone))) return fail('Enter a valid phone number.');
    if (photo && (typeof photo !== 'string' || photo.length > 400000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(photo))) return fail('Choose a valid JPEG, PNG, or WebP image.');
    req.account.fullName = fullName.trim();
    req.account.phone = phone.trim();
    if (photo) req.account.avatar = photo;
    await req.account.save();
    req.session.profileNotice = 'Your personal details have been saved.';
    req.session.save(err => err ? next(err) : res.redirect('/profile'));
  } catch (err) { next(err); }
};
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const fail = error => res.status(400).render('user/editProfile', {error});
    if (typeof currentPassword !== 'string' || Buffer.byteLength(currentPassword) > 72 || !validPassword(newPassword)) return fail('Use a new password of at least 8 characters and at most 72 bytes.');
    if (newPassword !== confirmPassword) return fail('New passwords do not match.');
    const user = await User.findById(req.session.userId).select('+password');
    if (!user?.password) return fail('This account signs in with Google. Manage your password in your Google Account.');
    if (!(await bcrypt.compare(currentPassword, user.password))) return fail('Your current password is incorrect.');
    if (await bcrypt.compare(newPassword, user.password)) return fail('Choose a password different from your current password.');
    const version = req.session.sessionVersion ?? 0;
    const result = await User.updateOne({
      _id: user.id, password: user.password, isBlocked: { $ne: true },
      sessionVersion: version === 0 ? { $in: [0, null] } : version
    }, {
      $set: { password: await bcrypt.hash(newPassword, 12) },
      $inc: { sessionVersion: 1 },
      $unset: { passwordReset: 1, emailChange: 1 }
    });
    if (!result.modifiedCount) return fail('Your account changed. Please sign in again.');
    const id = user.id;
    req.session.regenerate(err => {
      if (err) return next(err);
      req.session.userId = id;
      req.session.sessionVersion = version + 1;
      req.session.profileNotice = 'Your password has been updated.';
      req.session.save(err => err ? next(err) : res.redirect('/profile/edit'));
    });
  } catch (err) { next(err); }
};

exports.logout = (req, res, next) => req.session.destroy(err => {
  if (err) return next(err);
  res.clearCookie('elenor.sid');
  res.redirect('/login');
});
