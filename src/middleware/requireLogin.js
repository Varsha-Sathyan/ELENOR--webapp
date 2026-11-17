
const User = require('../models/User');

async function requireLogin(req, res, next) {
    const sessionCheck = req.path === '/auth/session';
    res.set('Cache-Control', 'no-store');
    if (!req.session || !req.session.userId) {
        return sessionCheck ? res.sendStatus(401) : res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.userId).select('isBlocked sessionVersion');
        if (!user || user.isBlocked || (req.session.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) {
            const destination = user?.isBlocked ? '/login?blocked=1' : '/login';
            return req.session.destroy(error => {
                if (error) return next(error);
                res.clearCookie('elenor.sid');
                if (sessionCheck) return res.sendStatus(user?.isBlocked ? 403 : 401);
                res.redirect(destination);
            });
        }
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = requireLogin;
