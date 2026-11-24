const express = require('express');
const path = require('node:path');
const createSession = require('./config/session');
const pages = require('./controllers/pageController');
const errors = require('./middleware/errorHandlers');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));
app.use(express.json());

// Admin and customer cookies remain isolated.
app.use('/admin', createSession('elenor.admin.sid', '/admin'), require('./routes/adminRoutes'));
app.use(createSession('elenor.sid', '/'));
app.use(require('./routes/authRoutes'));
app.use(require('./routes/userRoutes'));
app.get('/', pages.index);
app.use(require('./routes/storefrontRoutes'));
app.use(errors.notFound);
app.use(errors.handleError);

module.exports = app;
