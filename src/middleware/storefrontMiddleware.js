const crypto = require('node:crypto');
const User = require('../models/User');
const requireLogin = require('./requireLogin');

exports.checkCustomerSession = (req, res, next) => {
  if (req.session.userId) return requireLogin(req, res, next);
  next();
};
