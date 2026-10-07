const Room = require('../models/Room');

let ioInstance = null;

const initRoomHoldService = (io) => {
  ioInstance = io;

  // Run cleanup check every 5 seconds
  setInterval(async () => {
    try {
      const now = new Date();
      // Find held rooms that have expired
      const expiredRooms = await Room.find({
        status: 'held',
        heldUntil: { $lt: now },
      });

      if (expiredRooms.length > 0) {
        // Revert expired rooms back to available
        await Room.updateMany(
          {
            _id: { $in: expiredRooms.map((r) => r._id) },
          },
          {
            $set: {
              status: 'available',
              heldBy: null,
              heldUntil: null,
            },
          }
        );

        console.log(`⏰ Released ${expiredRooms.length} expired room holds`);

        // Fetch refreshed rooms and broadcast via socket
        const updatedRooms = await Room.find({
          _id: { $in: expiredRooms.map((r) => r._id) },
        });

        if (ioInstance) {
          ioInstance.emit('rooms:updated', {
            type: 'EXPIRED_HOLD_RELEASED',
            rooms: updatedRooms,
          });
        }
      }
    } catch (error) {
      console.error('Room Hold Cleanup Error:', error.message);
    }
  }, 5000);
};

module.exports = { initRoomHoldService };
