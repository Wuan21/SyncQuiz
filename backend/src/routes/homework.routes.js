const router = require('express').Router();
const ctrl = require('../controllers/homework.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/', authenticate, ctrl.create);
router.get('/my', authenticate, ctrl.myHomework);
router.get('/student', authenticate, ctrl.studentHomework);
router.get('/:id', authenticate, ctrl.getHomeworkDetails);
router.post('/:id/submit', authenticate, ctrl.submit);
router.get('/:id/results', authenticate, ctrl.results);

module.exports = router;
