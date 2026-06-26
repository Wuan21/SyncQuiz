const router = require('express').Router();
const ctrl = require('../controllers/sessions.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/', authenticate, ctrl.create);
router.get('/history', authenticate, ctrl.myHistory);
router.get('/pin/:pin', ctrl.getByPin);
router.get('/:id/result', authenticate, ctrl.getResult);

module.exports = router;
