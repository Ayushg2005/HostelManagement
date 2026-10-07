const express = require('express');
const router = express.Router();
const {
  createLeaveLog,
  getMyLeaveLogs,
  getAllLeaveLogsAdmin,
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('student'), createLeaveLog);
router.get('/my', protect, authorize('student'), getMyLeaveLogs);
router.get('/admin', protect, authorize('admin'), getAllLeaveLogsAdmin);

module.exports = router;
