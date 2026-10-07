const express = require('express');
const router = express.Router();
const { getRooms, holdRoom, confirmBooking, releaseHold, vacateRoom } = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getRooms);
router.post('/:id/hold', protect, holdRoom);
router.post('/:id/confirm', protect, confirmBooking);
router.post('/:id/release', protect, releaseHold);
router.post('/:id/vacate', protect, authorize('ADMIN'), vacateRoom);

module.exports = router;
