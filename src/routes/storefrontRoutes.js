const express = require('express');
const { randomBytes } = require('node:crypto');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();
const products = [
  { slug: 'radiance-serum', name: 'Radiance Serum', category: 'Botanical Elixir', price: 2400,
    description: 'A lightweight botanical serum for your daily beauty ritual.' },
  { slug: 'restorative-cream', name: 'Hydrating Restorative Cream', category: 'Daily Moisture', price: 2200,
    description: 'A rich cream with a soft finish for your morning or evening routine.' },
  { slug: 'signature-parfum', name: 'Signature Parfum', category: 'Eau de Parfum', price: 3800,
    description: 'A warm fragrance with an amber character, presented in faceted glass.' }
];
const price = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0
});

function storefront(req, res, next) {
  req.session.cartToken ||= randomBytes(32).toString('hex');
  res.set('Cache-Control', 'no-store');
  res.locals.products = products;
  res.locals.money = amount => price.format(amount);
  res.locals.cartToken = req.session.cartToken;
  next();
}

router.get('/home', requireLogin, storefront, (req, res) => res.render('home'));
router.get('/products', storefront, (req, res) => res.render('shop', { page: 'products', title: 'Top Products' }));
router.get('/products/:slug', storefront, (req, res, next) => {
  const product = products.find(item => item.slug === req.params.slug);
  if (!product) return next();
  res.render('shop', { page: 'product', title: product.name, product });
});

router.get('/cart', storefront, (req, res) => {
  const lines = products
    .filter(product => req.session.cart?.[product.slug])
    .map(product => ({ product, quantity: req.session.cart[product.slug] }));
  const subtotal = lines.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
  res.render('shop', { page: 'cart', title: 'Shopping Bag', lines, subtotal });
});

router.post('/cart/:slug', (req, res, next) => {
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
});

module.exports = router;
