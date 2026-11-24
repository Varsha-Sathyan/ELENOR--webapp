const crypto = require('node:crypto');
const User = require('../models/User');
const requireLogin = require('./requireLogin');

exports.prepareRecovery = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  req.session.recoveryToken ||= crypto.randomBytes(32).toString('hex');
  res.locals.recoveryToken = req.session.recoveryToken;
  res.locals.error = null;
  res.locals.resetDeadline = req.session.passwordRecovery?.expiresAt || 0;
  next();
};

exports.verifyCsrf = (req, res, next) => {
  if (req.method === 'POST' && req.body?._csrf !== req.session.recoveryToken) return res.sendStatus(403);
  next();
};
