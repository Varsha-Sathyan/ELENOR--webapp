const { digest, saveSession, signIn, issueOtp } = require('../services/authService');

const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const User = require('../models/User');

const blockedMessage = 'Your access has been denied by an admin. You can sign in when your account is unblocked.';

exports.checkSession = (req, res) => res.sendStatus(204);
const { normalizeEmail, validPassword } = require('../services/authValidation');
const { resolveReferral } = require('../services/referrals');

const renderOtp = (req, res, error = null, status = 200) => res.status(status).render('auth/otp', {
  email: req.session.pendingSignup.email, error: error || req.session.pendingSignup.deliveryError || null,
  developmentMode: false,
  codeSent: Boolean(req.session.pendingSignup.otpHash),
  resendSeconds: Math.max(0, Math.ceil(((req.session.pendingSignup.resendAfter || 0) - Date.now()) / 1000))
});

exports.showSignup = (req, res) => res.render('auth/signup', {
  error: null,
  values: { referralId: typeof req.query.ref === 'string' ? req.query.ref.slice(0, 100) : '' }
});
exports.showLogin = (req, res) => res.render('auth/login', {
  error: null,
  success: req.query.reset === '1' ? 'Your password has been reset. Sign in with your new password.' : null
});

exports.signup = async (req, res, next) => {
  try {
    const { fullName, email, password, confirmPassword, referralId, terms } = req.body || {};
    const fail = error => res.status(400).render('auth/signup', { error, values: {
      fullName: typeof fullName === 'string' ? fullName : '',
      email: typeof email === 'string' ? email : '',
      referralId: typeof referralId === 'string' ? referralId : '', terms: terms === 'on'
    } });
    const normalizedEmail = normalizeEmail(email);
    if (typeof fullName !== 'string' || fullName.length > 120 || !/^\p{L}[\p{L}\p{M}]*(?: +\p{L}[\p{L}\p{M}]*)*$/u.test(fullName.trim())) {
      return fail('Enter your full name using letters and spaces only (up to 120 characters).');
    }
    if (!normalizedEmail) return fail('Enter a valid email address.');
    if (!validPassword(password)) return fail('Enter a password of at least 8 characters and at most 72 bytes. It cannot be only spaces.');
    if (password !== confirmPassword) return fail('Passwords do not match.');
    if (terms !== 'on') return fail('Please accept the terms and conditions.');
    const referral = await resolveReferral(referralId, normalizedEmail);
    if (!referral) return fail('Enter a valid referral code or leave it blank.');
    if (await User.exists({ email: normalizedEmail })) return fail('An account with this email already exists. Please sign in.');
    if (req.session.pendingSignup?.resendAfter > Date.now()) return fail('Please wait until the current code expires before requesting another code.');
    const pending = { fullName: fullName.trim(), email: normalizedEmail,
      password: await bcrypt.hash(password, 12), ...referral, attempts: 0 };
    req.session.pendingSignup = pending;
    await saveSession(req);
    try {
      await issueOtp(pending);
    } catch (error) {
      pending.deliveryError = 'Your details are saved for verification, but the email could not be sent. Please try Resend OTP. Email delivery must be configured before you can verify.';
    }
    req.session.pendingSignup = pending;
    await saveSession(req);
    res.redirect('/verify-otp');
  } catch (err) { next(err); }
};

exports.showOtp = (req, res) => {
  if (!req.session.pendingSignup) return res.redirect('/signup');
  renderOtp(req, res);
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const pending = req.session.pendingSignup;
    if (!pending) return res.redirect('/signup');
    if (!pending.otpHash) return renderOtp(req, res, 'No code has been sent yet. Please use Resend OTP after email delivery is configured.', 400);
    if (pending.attempts >= 5) return renderOtp(req, res, 'Too many attempts. Start signup again.', 429);
    if (Date.now() >= pending.expiresAt) return renderOtp(req, res, 'This code has expired. Request a new code.', 400);
    pending.attempts++;
    const otp = req.body.otp;
    if (typeof otp !== 'string' || !/^\d{4}$/.test(otp) || !crypto.timingSafeEqual(Buffer.from(digest(otp)), Buffer.from(pending.otpHash))) {
      await saveSession(req);
      return renderOtp(req, res, 'Incorrect code. Please enter your four-digit OTP.', 400);
    }
    const user = await User.create({ fullName: pending.fullName, email: pending.email, password: pending.password, referralId: pending.referralId, referredBy: pending.referredBy, emailVerified: true });
    await signIn(req, user);
    res.redirect(303, '/home');
  } catch (err) {
    if (err.code === 11000) {
      delete req.session.pendingSignup;
      await saveSession(req);
      return res.status(409).render('auth/login', { error: 'This email is already registered. Please sign in.' });
    }
    next(err);
  }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const pending = req.session.pendingSignup;
    if (!pending) return res.redirect('/signup');
    if (pending.attempts >= 5) return renderOtp(req, res, 'Too many attempts. Start signup again.', 429);
    if (Date.now() < pending.resendAfter) return renderOtp(req, res, 'Please wait before requesting another code.', 429);
    try {
      await issueOtp(pending);
    } catch (error) {
      return renderOtp(req, res, error.message, 503);
    }
    delete pending.deliveryError;
    await saveSession(req);
    res.redirect('/verify-otp');
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
   try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const wantsJson = req.get('Accept') === 'application/json';
    const fail = (status, error) => wantsJson
      ? res.status(status).json({ error })
      : res.status(status).render('auth/login', { error, emailValue: typeof email === 'string' ? email.slice(0, 254) : '' });
    if (!normalizedEmail) return fail(400, 'Enter a valid email address.');
    if (typeof password !== 'string' || !password.length || Buffer.byteLength(password) > 72) return fail(400, 'Enter your password (up to 72 bytes).');
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user?.password || !user.emailVerified || !(await bcrypt.compare(password, user.password))) return fail(401, 'Invalid email or password. If you signed up with Google, use Continue with Google.');
    if (user.isBlocked) return fail(403, blockedMessage);
    await signIn(req, user);
    if (wantsJson) return res.json({ signedIn: true });
    res.redirect(303, '/home');
  } catch (err) { next(err); }
};
