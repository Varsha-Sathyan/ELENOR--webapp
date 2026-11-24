const crypto = require('node:crypto');
const User = require('../models/User');
const requireLogin = require('./requireLogin');

exports.loadAccount = async (req, res, next) => {
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
};

exports.verifyCsrf = (req, res, next) => {
  if (req.method === 'POST' && (typeof req.body._csrf !== 'string' || req.body._csrf !== req.session.profileToken)) return res.status(403).send('Please reload your account page and try again.');
  next();
};
