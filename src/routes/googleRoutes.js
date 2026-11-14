const express = require('express');
const { createHash, randomBytes } = require('node:crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { normalizeEmail } = require('../services/authValidation');

const router = express.Router();
const randomToken = () => randomBytes(32).toString('base64url');

function googleClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) return null;
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

function renderError(res, mode, status, error) {
  return res.status(status).render('auth/' + mode, { error });
}

function startGoogle(mode) {
  return (req, res, next) => {
    if (req.session.userId) return res.redirect('/home');
    const client = googleClient();
    if (!client) return renderError(res, mode, 503, 'Google sign-in is not available yet. You can continue with email.');
    const state = randomToken();
    const nonce = randomToken();
    const verifier = randomToken();
    req.session.googleFlow = { state, nonce, verifier, mode, expiresAt: Date.now() + 10 * 60 * 1000 };
    const url = client.generateAuthUrl({
      response_type: 'code',
      prompt: 'select_account',
      scope: ['openid', 'email', 'profile'],
      state,
      nonce,
      code_challenge_method: 'S256',
      code_challenge: createHash('sha256').update(verifier).digest('base64url')
    });
    req.session.save(error => error ? next(error) : res.redirect(url));
  };
}

router.get('/auth/google', startGoogle('login'));
router.get('/auth/google/signup', startGoogle('signup'));

router.get('/auth/google/callback', async (req, res, next) => {
  const flow = req.session.googleFlow;
  if (!flow || flow.expiresAt <= Date.now() || req.query.state !== flow.state) {
    return renderError(res, flow?.mode || 'login', 400, 'The Google sign-in request expired or is invalid. Please start again.');
  }
  const { mode } = flow;
  delete req.session.googleFlow;
  try {
    await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
  } catch (error) { return next(error); }
  if (req.query.error || typeof req.query.code !== 'string' || !req.query.code) {
    return renderError(res, mode, 400, 'Google sign-in was cancelled or could not be completed. Please try again.');
  }
  const client = googleClient();
  if (!client) return renderError(res, mode, 503, 'Google sign-in is not available yet.');
  let identity;
  try {
    const { tokens } = await client.getToken({ code: req.query.code, codeVerifier: flow.verifier });
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    identity = ticket.getPayload();
  } catch {
    return renderError(res, mode, 502, 'Google could not complete sign-in. Please try again.');
  }
  const email = normalizeEmail(identity?.email);
  if (!identity?.sub || identity.nonce !== flow.nonce || identity.email_verified !== true || !email) {
    return renderError(res, mode, 401, 'Google could not verify this account. Please try again.');
  }
  try {
    let user = await User.findOne({ googleSubject: identity.sub });
    if (!user) {
      if (await User.exists({ email })) {
        return renderError(res, mode, 409, 'An account already uses this email. Sign in with the method you originally used.');
      }
      try {
        user = await User.create({
          googleSubject: identity.sub,
          email,
          fullName: typeof identity.name === 'string' && identity.name.trim()
            ? identity.name.trim().slice(0, 120) : email.split('@')[0].slice(0, 120),
          emailVerified: true
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        user = await User.findOne({ googleSubject: identity.sub });
        if (!user) return renderError(res, mode, 409, 'An account already uses this email. Sign in with the method you originally used.');
      }
    }
    if (user.isBlocked || !user.emailVerified) return renderError(res, mode, 403, 'This account cannot sign in.');
    const cart = req.session.cart;
    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.userId = user.id;
    if (cart) req.session.cart = cart;
    req.session.save(error => error ? next(error) : res.redirect('/home'));
  } catch (error) { next(error); }
});

module.exports = router;
