
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
module.exports = { products, price };
