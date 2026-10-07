const Room = require('../models/Room');
const User = require('../models/User');

// Helper to get Socket.io instance
const getIO = (req) => req.app.get('io');

// @desc    Get all 150 rooms & metrics
// @route   GET /api/rooms
// @access  Private
const getRooms = async (req, res) => {
  try {
    const now = new Date();

    // Auto-release expired holds
    await Room.updateMany(
      { status: 'HELD', heldUntil: { $lt: now } },
      { $set: { status: 'AVAILABLE', heldBy: null, heldUntil: null } }
    );

    const rooms = await Room.find()
      .populate('heldBy', 'name email')
      .populate('occupiedBy', 'name email usn phoneNumber')
      .sort({ number: 1 });

    const total = rooms.length;
    const available = rooms.filter((r) => r.status === 'AVAILABLE').length;
    const held = rooms.filter((r) => r.status === 'HELD').length;
    const occupied = rooms.filter((r) => r.status === 'OCCUPIED').length;

    return res.status(200).json({
      success: true,
      metrics: { total, available, held, occupied },
      rooms,
    });
  } catch (error) {
    console.error('getRooms error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching rooms' });
  }
};

// @desc    Atomic Room Hold Request (5 Minute Countdown)
// @route   POST /api/rooms/:id/hold
// @access  Private (Student)
const holdRoom = async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    let config = await SystemConfig.findOne({ key: 'main_config' });
    if (config && !config.isAllotmentOpen && req.user.role === 'STUDENT') {
      return res.status(403).json({
        success: false,
        message: 'Room Allotment is currently locked by the Hostel Warden. Please wait for the admin to initiate the allotment process.',
      });
    }

    const roomId = req.params.id;
    const userId = req.user._id;
    const now = new Date();
    const holdDurationMs = 5 * 60 * 1000; // 5 minutes
    const heldUntil = new Date(now.getTime() + holdDurationMs);

    // Check if user already occupies a room
    const existingOccupied = await Room.findOne({ occupiedBy: userId });
    if (existingOccupied) {
      return res.status(400).json({
        success: false,
        message: `You already have an confirmed allotment for Room ${existingOccupied.number}`,
      });
    }

    // Release any previous hold by this same student on another room (Atomic)
    const previousHold = await Room.findOneAndUpdate(
      { heldBy: userId, status: 'HELD', _id: { $ne: roomId } },
      { $set: { status: 'AVAILABLE', heldBy: null, heldUntil: null } },
      { new: true }
    );

    if (previousHold) {
      const io = getIO(req);
      if (io) {
        io.emit('room_status_changed', {
          roomId: previousHold._id,
          roomNumber: previousHold.number,
          status: 'AVAILABLE',
          heldBy: null,
          heldUntil: null,
        });
      }
    }

    // ATOMIC LOCK OPERATION
    // Matches room only if status is AVAILABLE or if previous hold is expired
    const room = await Room.findOneAndUpdate(
      {
        _id: roomId,
        $or: [
          { status: 'AVAILABLE' },
          { status: 'HELD', heldUntil: { $lt: now } },
          { status: 'HELD', heldBy: userId }, // Re-up hold if already held by self
        ],
      },
      {
        $set: {
          status: 'HELD',
          heldBy: userId,
          heldUntil: heldUntil,
        },
      },
      { new: true }
    ).populate('heldBy', 'name email');

    if (!room) {
      return res.status(409).json({
        success: false,
        message: 'Concurrency Lock Failure: Room has already been held or confirmed by another student.',
      });
    }

    // Broadcast room hold event instantly via Socket.io
    const io = getIO(req);
    if (io) {
      io.emit('room_status_changed', {
        roomId: room._id,
        roomNumber: room.number,
        status: 'HELD',
        heldBy: { _id: req.user._id, name: req.user.name, email: req.user.email },
        heldUntil: room.heldUntil,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Room ${room.number} held for 5 minutes. Please confirm your booking before timer expires.`,
      room,
    });
  } catch (error) {
    console.error('holdRoom error:', error);
    return res.status(500).json({ success: false, message: 'Server error placing room hold' });
  }
};

// @desc    Confirm held room booking (Atomic Operation)
// @route   POST /api/rooms/:id/confirm
// @access  Private (Student)
const confirmBooking = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user._id;
    const now = new Date();

    // Check if student already occupies any room
    const existingOccupied = await Room.findOne({ occupiedBy: userId });
    if (existingOccupied) {
      return res.status(400).json({
        success: false,
        message: `You already have an active allotment for Room ${existingOccupied.number}. You cannot book more than one room.`,
      });
    }

    // ATOMIC CONFIRMATION OPERATION
    // Only succeeds if room is currently HELD by this exact userId AND hold is not expired
    const room = await Room.findOneAndUpdate(
      {
        _id: roomId,
        heldBy: userId,
        status: 'HELD',
        heldUntil: { $gte: now },
      },
      {
        $set: {
          status: 'OCCUPIED',
          occupiedBy: userId,
          bookedAt: now,
          heldBy: null,
          heldUntil: null,
        },
      },
      { new: true }
    ).populate('occupiedBy', 'name email usn phoneNumber');

    if (!room) {
      // Check why it failed
      const existingRoom = await Room.findById(roomId);
      if (!existingRoom) {
        return res.status(404).json({ success: false, message: 'Room not found.' });
      }
      if (existingRoom.status === 'OCCUPIED') {
        return res.status(409).json({
          success: false,
          message: `Booking failed: Room ${existingRoom.number} has already been occupied by another student.`,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Booking confirmation failed: You do not hold this room or your 5-minute hold timer expired.',
      });
    }

    // Link user profile
    await User.findByIdAndUpdate(userId, { roomId: room._id });

    // Broadcast Socket.io event
    const io = getIO(req);
    if (io) {
      io.emit('room_status_changed', {
        roomId: room._id,
        roomNumber: room.number,
        status: 'OCCUPIED',
        occupiedBy: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          usn: req.user.usn,
        },
        bookedAt: room.bookedAt,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Congratulations! Room ${room.number} has been successfully allotted to you.`,
      room,
    });
  } catch (error) {
    console.error('confirmBooking error:', error);
    return res.status(500).json({ success: false, message: 'Server error confirming booking' });
  }
};

// @desc    Release active hold
// @route   POST /api/rooms/:id/release
// @access  Private (Student)
const releaseHold = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user._id;

    // ATOMIC RELEASE OPERATION
    const room = await Room.findOneAndUpdate(
      { _id: roomId, heldBy: userId, status: 'HELD' },
      { $set: { status: 'AVAILABLE', heldBy: null, heldUntil: null } },
      { new: true }
    );
    
    if (!room) {
      return res.status(400).json({ success: false, message: 'No active hold found on this room.' });
    }

    const io = getIO(req);
    if (io) {
      io.emit('room_status_changed', {
        roomId: room._id,
        roomNumber: room.number,
        status: 'AVAILABLE',
        heldBy: null,
        heldUntil: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Hold on Room ${room.number} has been released.`,
      room,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error releasing room hold' });
  }
};

// @desc    Vacate/Reset occupied room (Warden Admin Only)
// @route   POST /api/rooms/:id/vacate
// @access  Private (Admin)
const vacateRoom = async (req, res) => {
  try {
    const roomId = req.params.id;

    const room = await Room.findOneAndUpdate(
      { _id: roomId },
      {
        $set: {
          status: 'AVAILABLE',
          occupiedBy: null,
          heldBy: null,
          heldUntil: null,
          bookedAt: null,
        }
      }
    );

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.occupiedBy) {
      await User.findByIdAndUpdate(room.occupiedBy, { roomId: null });
    }

    const io = getIO(req);
    if (io) {
      io.emit('room_status_changed', {
        roomId: room._id,
        roomNumber: room.number,
        status: 'AVAILABLE',
        occupiedBy: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Room ${room.number} has been vacated and reset to Available by Warden.`,
      room,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error vacating room' });
  }
};

module.exports = {
  getRooms,
  holdRoom,
  confirmBooking,
  releaseHold,
  vacateRoom,
};
