const router = require('express').Router();
const ctrl = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/dashboard', authenticate, ctrl.dashboard);
router.get('/quiz/:quizId', authenticate, ctrl.quizStats);

module.exports = router;
