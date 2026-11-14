const router = require('express').Router();
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User');
router.use(['/profile', '/edit-profile', '/logout'], require('../middleware/requireLogin'));
router.use(['/profile', '/edit-profile', '/logout'], async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return req.session.destroy(() => res.redirect('/login'));
    req.account = user;
    req.session.profileToken ||= crypto.randomBytes(32).toString('hex');
    res.locals.account = user;
    res.locals.token = req.session.profileToken;
    res.locals.initials = user.fullName.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
    res.locals.error = null;
    res.locals.success = req.session.profileNotice || null;
    delete req.session.profileNotice;
    res.set('Cache-Control', 'no-store');
    next();
  } catch (err) { next(err); }
});
router.get('/profile', (req, res) => res.render('user/profile'));
router.get(['/profile/edit', '/edit-profile'], (req, res) => res.render('user/editProfile'));
router.use(['/profile', '/edit-profile', '/logout'], (req, res, next) => {
  if (req.method === 'POST' && (typeof req.body._csrf !== 'string' || req.body._csrf !== req.session.profileToken)) return res.status(403).send('Please reload your account page and try again.');
  next();
});
router.post('/profile/edit', async (req, res, next) => {
  try {
    const { fullName, phone, photo } = req.body;
    const fail = error => res.status(400).render('user/editProfile', {error});
    if (typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 120) return fail('Enter a name between 1 and 120 characters.');
    if (typeof phone !== 'string' || phone.length > 30 || (phone && !/^[+\d\s().-]{7,30}$/.test(phone))) return fail('Enter a valid phone number.');
    if (photo && (typeof photo !== 'string' || photo.length > 400000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(photo))) return fail('Choose a valid JPEG, PNG, or WebP image.');
    req.account.fullName = fullName.trim();
    req.account.phone = phone.trim();
    if (photo) req.account.avatar = photo;
    await req.account.save();
    req.session.profileNotice = 'Your personal details have been saved.';
    req.session.save(err => err ? next(err) : res.redirect('/profile'));
  } catch (err) { next(err); }
});
router.post('/profile/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const fail = error => res.status(400).render('user/editProfile', {error});
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword) > 72) return fail('Use a new password of at least 8 characters and at most 72 bytes.');
    if (newPassword !== confirmPassword) return fail('New passwords do not match.');
    const user = await User.findById(req.session.userId).select('+password');
    if (!user?.password) return fail('This account signs in with Google. Manage your password in your Google Account.');
    if (!(await bcrypt.compare(currentPassword, user.password))) return fail('Your current password is incorrect.');
    if (await bcrypt.compare(newPassword, user.password)) return fail('Choose a password different from your current password.');
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    const id = user.id;
    req.session.regenerate(err => {
      if (err) return next(err);
      req.session.userId = id;
      req.session.profileNotice = 'Your password has been updated.';
      req.session.save(err => err ? next(err) : res.redirect('/profile/edit'));
    });
  } catch (err) { next(err); }
});
router.post('/logout', (req, res, next) => req.session.destroy(err => {
  if (err) return next(err);
  res.clearCookie('elenor.sid');
  res.redirect('/login');
}));
module.exports = router;
