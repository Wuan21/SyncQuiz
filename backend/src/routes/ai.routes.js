const router = require('express').Router();
const ctrl = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/generate', authenticate, ctrl.generateQuiz);

module.exports = router;
