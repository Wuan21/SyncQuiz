const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/questions.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Mounted at /api/questions/:quizId/questions — but we re-export at top level too
router.get('/:quizId/questions', authenticate, ctrl.list);
router.post('/:quizId/questions', authenticate, ctrl.create);
router.patch('/:quizId/questions/:id', authenticate, ctrl.update);
router.delete('/:quizId/questions/:id', authenticate, ctrl.remove);
router.put('/:quizId/questions/reorder', authenticate, ctrl.reorder);

module.exports = router;
