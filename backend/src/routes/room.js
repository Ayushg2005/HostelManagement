const express = require('express');
const router = express.Router();
const {
  getRooms,
  holdRoom,
  confirmRoom,
  releaseRoom,
} = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getRooms);
router.post('/:id/hold', protect, authorize('student'), holdRoom);
router.post('/:id/confirm', protect, authorize('student'), confirmRoom);
router.post('/:id/release', protect, authorize('student'), releaseRoom);

module.exports = router;
