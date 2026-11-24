const session = require('express-session');

module.exports = function createSession(name, path) {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is missing from .env');
  return session({
    name, secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false,
    cookie: { path, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }
  });
};
