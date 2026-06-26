const router = require('express').Router();
const ctrl = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/presign', authenticate, ctrl.presign);
router.delete(/\/(.+)/, authenticate, ctrl.deleteFile);

module.exports = router;
