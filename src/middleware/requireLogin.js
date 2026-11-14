
const User = require('../models/User');

async function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.redirect("/login");
    }

    try {
        const user = await User.findById(req.session.userId).select('isBlocked');
        if (!user || user.isBlocked) {
            delete req.session.userId;
            return res.redirect('/login');
        }
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = requireLogin;
