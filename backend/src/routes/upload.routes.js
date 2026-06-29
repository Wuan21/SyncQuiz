const router = require('express').Router();
const ctrl = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Enable preflight for all upload routes
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

router.post('/presign', authenticate, ctrl.presign);
router.post('/local-put', ctrl.localPut); // No auth needed - uses UUID fileId
router.put('/local-put', ctrl.localPut);  // Accept both POST and PUT
router.get('/get/:fileId', ctrl.getLocalFile);
router.delete(/\/(.+)/, authenticate, ctrl.deleteFile);

module.exports = router;
