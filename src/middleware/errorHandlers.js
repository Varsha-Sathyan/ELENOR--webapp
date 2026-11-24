exports.notFound = (req, res) => res.status(404).render('404', {
  accountUrl: req.session?.userId ? '/profile' : '/login',
  signedIn: Boolean(req.session?.userId)
});

exports.handleError = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('Application error:', error);
  res.status(500).send('Something went wrong. Please try again.');
};
