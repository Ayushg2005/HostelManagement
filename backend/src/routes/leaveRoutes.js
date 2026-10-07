const express = require('express');
const router = express.Router();
const { createLeaveRequest, getLeaveLogs, reviewLeaveRequest } = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, createLeaveRequest);
router.get('/', protect, getLeaveLogs);
router.put('/:id/review', protect, authorize('ADMIN'), reviewLeaveRequest);

module.exports = router;
