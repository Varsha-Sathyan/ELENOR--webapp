const router = require('express').Router();
const controller = require('../controllers/googleController');
router.get('/auth/google', controller.startGoogle('login'));
router.get('/auth/google/signup', controller.startGoogle('signup'));
router.get('/auth/google/callback', controller.completeSignIn);
module.exports = router;
