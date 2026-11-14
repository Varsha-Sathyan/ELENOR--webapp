module.exports = (req, res, next) => {
  if (!req.session?.isAdmin) return res.redirect('/admin/login');
  res.set('Cache-Control', 'no-store');
  next();
};
