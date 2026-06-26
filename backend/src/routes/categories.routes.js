const router = require('express').Router();
const ctrl = require('../controllers/categories.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/', ctrl.list);
router.post('/', authenticate, authorize('admin'), ctrl.create);
router.patch('/:id', authenticate, authorize('admin'), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);

module.exports = router;
