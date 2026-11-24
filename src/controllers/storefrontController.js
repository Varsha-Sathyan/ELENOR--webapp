const { products, price } = require('../services/productService');

const { randomBytes } = require('node:crypto');

function storefront(req, res, next) {
  res.locals.signedIn = Boolean(req.session.userId);
  req.session.cartToken ||= randomBytes(32).toString('hex');
  res.set('Cache-Control', 'no-store');
  res.locals.products = products;
  res.locals.money = amount => price.format(amount);
  res.locals.cartToken = req.session.cartToken;
  next();
}

exports.showHome = (req, res) => res.render('home');
exports.listProducts = (req, res) => res.render('shop', { page: 'products', title: 'Top Products' });
exports.showProduct = (req, res, next) => {
  const product = products.find(item => item.slug === req.params.slug);
  if (!product) return next();
  res.render('shop', { page: 'product', title: product.name, product });
};

exports.showCart = (req, res) => {
  const lines = products
    .filter(product => req.session.cart?.[product.slug])
    .map(product => ({ product, quantity: req.session.cart[product.slug] }));
  const subtotal = lines.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
  res.render('shop', { page: 'cart', title: 'Shopping Bag', lines, subtotal });
};

exports.updateCart = (req, res, next) => {
  if (!req.session.cartToken || req.body._csrf !== req.session.cartToken) return res.sendStatus(403);
  const product = products.find(item => item.slug === req.params.slug);
  if (!product) return next();
  const cart = req.session.cart ||= {};
  if (req.body.action === 'remove') {
    delete cart[product.slug];
  } else if (req.body.action === 'add') {
    cart[product.slug] = Math.min((cart[product.slug] || 0) + 1, 99);
  } else {
    return res.sendStatus(400);
  }
  req.session.save(error => error ? next(error) : res.redirect(303, '/cart'));
};

exports.prepareStorefront = storefront;
