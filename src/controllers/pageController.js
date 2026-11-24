exports.index = (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.redirect(req.session?.userId ? '/home' : '/login');
};
