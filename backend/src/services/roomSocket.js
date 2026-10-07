const { cleanupExpiredHolds } = require('../utils/seedRooms');

const initRoomSocketService = (io) => {
  // Interval scanning for expired holds every 10 seconds
  setInterval(async () => {
    await cleanupExpiredHolds(io);
  }, 10000);

  io.on('connection', (socket) => {
    console.log(`[RoomSocket] Client ${socket.id} subscribed to live room allotment channel.`);

    socket.on('request_grid_sync', async () => {
      // Client explicitly requested live grid sync
      const Room = require('../models/Room');
      const rooms = await Room.find()
        .populate('heldBy', 'name email')
        .populate('occupiedBy', 'name email usn');
      socket.emit('grid_sync_data', rooms);
    });
  });
};

module.exports = initRoomSocketService;
