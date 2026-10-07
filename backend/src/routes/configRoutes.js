const express = require('express');
const router = express.Router();
const { getConfig, toggleAllotment } = require('../controllers/configController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getConfig);
router.post('/toggle-allotment', protect, authorize('ADMIN'), toggleAllotment);

module.exports = router;
