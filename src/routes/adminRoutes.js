const router = require('express').Router();
const crypto = require('node:crypto');
const User = require('../models/User');
const requireAdmin = require('../middleware/requireAdmin');
const hash = value => crypto.createHash('sha256').update(value).digest();
const attempts = new Map();
router.get('/login', (req, res) => req.session.isAdmin ? res.redirect('/admin') : res.render('admin/login', {error:null}));
router.post('/login', async (req, res, next) => {
  try {
    const key = req.ip;
    const now = Date.now();
    for (const [ip, entry] of attempts) if (entry.until <= now) attempts.delete(ip);
    const entry = attempts.get(key) || {count:0,until:now+15*60*1000};
    if(entry.count >= 10) return res.status(429).render('admin/login',{error:'Too many attempts. Please try again in 15 minutes.'});
    const {email,password}=req.body;
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return res.status(503).render('admin/login',{error:'Admin access has not been configured.'});
    const valid = typeof email === 'string' && typeof password === 'string' &&
      crypto.timingSafeEqual(hash(email.trim().toLowerCase()),hash(process.env.ADMIN_EMAIL.trim().toLowerCase())) &&
      crypto.timingSafeEqual(hash(password),hash(process.env.ADMIN_PASSWORD));
    if(!valid){entry.count++;attempts.set(key,entry);return res.status(401).render('admin/login',{error:'Invalid admin email or password.'});}
    attempts.delete(key);
    await new Promise((resolve,reject)=>req.session.regenerate(err=>err?reject(err):resolve()));
    req.session.isAdmin=true;
    req.session.adminToken=crypto.randomBytes(32).toString('hex');
    req.session.save(err=>err?next(err):res.redirect('/admin'));
  }catch(err){next(err);}
});
router.use(requireAdmin);
const userSorts = {
  alphabetical: { fullName: 1, _id: 1 },
  latest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 }
};

function userListOptions(values) {
  return {
    q: typeof values.q === 'string' ? values.q.trim().slice(0, 120) : '',
    status: ['active', 'inactive'].includes(values.status) ? values.status : 'all',
    sort: typeof values.sort === 'string' && Object.hasOwn(userSorts, values.sort) ? values.sort : 'latest',
    page: typeof values.page === 'string' && /^\d{1,9}$/.test(values.page) ? Math.max(1, Number(values.page)) : 1
  };
}

function userListUrl(options, overrides = {}) {
  return '/admin/users?' + new URLSearchParams({ ...options, ...overrides });
}

router.get('/users', async (req, res, next) => {
  try {
    const options = userListOptions(req.query);
    const criteria = {};
    if (options.q) {
      const search = new RegExp(options.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      criteria.$or = [{ fullName: search }, { email: search }];
    }
    if (options.status !== 'all') criteria.isBlocked = options.status === 'inactive' ? true : { $ne: true };
    const [totalUsers, resultCount] = await Promise.all([User.countDocuments(), User.countDocuments(criteria)]);
    const pageSize = 10;
    const pageCount = Math.max(1, Math.ceil(resultCount / pageSize));
    options.page = Math.min(options.page, pageCount);
    const offset = (options.page - 1) * pageSize;
    const query = User.find(criteria).select('fullName email createdAt isBlocked').sort(userSorts[options.sort]);
    if (options.sort === 'alphabetical') query.collation({ locale: 'en', strength: 2 });
    const users = await query.skip(offset).limit(pageSize).lean();
    res.render('admin/users', {
      users, totalUsers, resultCount, pageCount, offset, options,
      url: overrides => userListUrl(options, overrides), token: req.session.adminToken
    });
  } catch (error) { next(error); }
});

router.post('/users/:id/access', async (req, res, next) => {
  try {
    if (!req.session.adminToken || req.body._csrf !== req.session.adminToken) return res.sendStatus(403);
    if (!/^[0-9a-f]{24}$/i.test(req.params.id) || !['block', 'unblock'].includes(req.body.action)) return res.sendStatus(400);
    const result = await User.updateOne({ _id: req.params.id }, { $set: { isBlocked: req.body.action === 'block' } });
    if (!result.matchedCount) return next();
    res.redirect(303, userListUrl(userListOptions(req.query)));
  } catch (error) { next(error); }
});
router.get(['/', '/dashboard'],async(req,res,next)=>{
  try {res.render('admin/dashboard',{totalUsers:await User.countDocuments(),token:req.session.adminToken});}
  catch(err){next(err);}
});
router.post('/logout',(req,res,next)=>{
  if(req.body._csrf !== req.session.adminToken || !req.session.adminToken) return res.status(403).send('Please reload the dashboard and try again.');
  req.session.destroy(err=>{if(err)return next(err);res.clearCookie('elenor.sid');res.redirect('/admin/login');});
});
module.exports=router;
