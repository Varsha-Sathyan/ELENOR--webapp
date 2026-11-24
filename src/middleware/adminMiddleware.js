const crypto = require('node:crypto');
const User = require('../models/User');
const requireLogin = require('./requireLogin');

exports.redirectAuthenticated = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.session.isAdmin) return res.redirect(303, '/admin');
  next();
};
