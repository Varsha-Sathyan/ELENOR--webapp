const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const User = require('../models/User');
const sendOtpEmail = require('../services/otpEmail');
const router = express.Router();
const { normalizeEmail, validPassword } = require('../services/authValidation');
router.use(['/login', '/signup', '/otp', '/verify-otp', '/resend-otp', '/auth/google'], (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.session.userId) return res.redirect(303, '/home');
  next();
});
router.use(require('./googleRoutes'));
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const saveSession = req => new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
async function signIn(req, user) {
  const cart = req.session.cart;
  await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  req.session.userId = user.id;
  if (cart) req.session.cart = cart;
  await saveSession(req);
}
const renderOtp = (req, res, error = null, status = 200) => res.status(status).render('auth/otp', {
  email: req.session.pendingSignup.email, error: error || req.session.pendingSignup.deliveryError || null,
  developmentMode: false,
  codeSent: Boolean(req.session.pendingSignup.otpHash),
  resendSeconds: Math.max(0, Math.ceil(((req.session.pendingSignup.resendAfter || 0) - Date.now()) / 1000))
});

async function issueOtp(pending) {
  const otp = String(crypto.randomInt(1000, 10000));
  await sendOtpEmail(pending.email, otp);
  pending.otpHash = digest(otp);
  pending.expiresAt = Date.now() + 5 * 60 * 1000;
  pending.resendAfter = Date.now() + 30000;
}
router.get('/signup', (req, res) => res.render('auth/signup', { error: null }));
router.get('/login', (req, res) => res.render('auth/login', { error: null }));

router.post('/signup', async (req, res, next) => {
  try {
    const { fullName, email, password, confirmPassword, referralId, terms } = req.body || {};
    const fail = error => res.status(400).render('auth/signup', { error, values: {
      fullName: typeof fullName === 'string' ? fullName : '',
      email: typeof email === 'string' ? email : '',
      referralId: typeof referralId === 'string' ? referralId : '', terms: terms === 'on'
    } });
    const normalizedEmail = normalizeEmail(email);
    if (typeof fullName !== 'string' || !fullName.trim() || fullName.length > 120 || /[\x00-\x1f\x7f]/.test(fullName)) return fail('Enter your full name (up to 120 characters).');
    if (!normalizedEmail) return fail('Enter a valid email address.');
    if (!validPassword(password)) return fail('Enter a password of at least 8 characters and at most 72 bytes. It cannot be only spaces.');
    if (password !== confirmPassword) return fail('Passwords do not match.');
    if (terms !== 'on') return fail('Please accept the terms and conditions.');
    if (referralId !== undefined && (typeof referralId !== 'string' || referralId.trim().length > 100)) return fail('Referral codes must be 100 characters or fewer.');
    if (await User.exists({ email: normalizedEmail })) return fail('An account with this email already exists. Please sign in.');
    if (req.session.pendingSignup?.resendAfter > Date.now()) return fail('Please wait 30 seconds before requesting another code.');
    const pending = { fullName: fullName.trim(), email: normalizedEmail,
      password: await bcrypt.hash(password, 12), referralId: typeof referralId === 'string' ? referralId.trim().slice(0, 100) : '', attempts: 0 };
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
});

router.get(['/verify-otp', '/otp'], (req, res) => {
  if (!req.session.pendingSignup) return res.redirect('/signup');
  renderOtp(req, res);
});

router.post(['/verify-otp', '/otp'], async (req, res, next) => {
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
    const user = await User.create({ fullName: pending.fullName, email: pending.email, password: pending.password, referralId: pending.referralId, emailVerified: true });
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
});

router.post('/resend-otp', async (req, res, next) => {
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
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const fail = (status, error) => res.status(status).render('auth/login', { error, emailValue: typeof email === 'string' ? email.slice(0, 254) : '' });
    if (!normalizedEmail) return fail(400, 'Enter a valid email address.');
    if (typeof password !== 'string' || !password.length || Buffer.byteLength(password) > 72) return fail(400, 'Enter your password (up to 72 bytes).');
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user?.password || !user.emailVerified || user.isBlocked || !(await bcrypt.compare(password, user.password))) return fail(401, 'Invalid email or password. If you signed up with Google, use Continue with Google.');
    await signIn(req, user);
    res.redirect('/home');
  } catch (err) { next(err); }
});


module.exports = router;
