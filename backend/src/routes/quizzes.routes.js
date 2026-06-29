const router = require('express').Router();
const ctrl = require('../controllers/quizzes.controller');
const importCtrl = require('../controllers/import.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

router.get('/', optionalAuth, ctrl.list);
router.get('/csv-template', importCtrl.csvTemplate);
router.get('/my', authenticate, ctrl.myQuizzes);
router.get('/:id', optionalAuth, ctrl.getOne);
router.get('/:id/full', optionalAuth, ctrl.getWithQuestions);
router.post('/', authenticate, ctrl.create);
router.patch('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);
router.post('/:id/clone', authenticate, ctrl.clone);
router.post('/:id/import-csv', authenticate, importCtrl.uploadMiddleware, importCtrl.importCSV);

module.exports = router;
