const Room = require('../models/Room');

const seedRooms = async (io) => {
  try {
    const count = await Room.countDocuments();
    if (count < 150) {
      console.log('[Seeder] Initializing 150 hostel rooms across 3 floors...');
      const roomsToInsert = [];

      for (let i = 1; i <= 150; i++) {
        let floor = 1;
        if (i > 50 && i <= 100) floor = 2;
        else if (i > 100) floor = 3;
        
        roomsToInsert.push({ number: i, floor: floor, status: 'AVAILABLE' });
      }

      await Room.deleteMany({ status: { $ne: 'OCCUPIED' } }); // keep existing occupied rooms if any
      for (const roomData of roomsToInsert) {
        await Room.updateOne(
          { number: roomData.number },
          { $setOnInsert: roomData },
          { upsert: true }
        );
      }
      console.log('[Seeder] 150 hostel rooms ready in database.');
    }

    // Clean up any expired holds on boot
    await cleanupExpiredHolds(io);
  } catch (err) {
    console.error('[Seeder] Error seeding rooms:', err.message);
  }
};

const cleanupExpiredHolds = async (io) => {
  try {
    const now = new Date();
    const expiredRooms = await Room.find({
      status: 'HELD',
      heldUntil: { $lt: now },
    });

    if (expiredRooms.length > 0) {
      console.log(`[Timer] Cleaning up ${expiredRooms.length} expired room holds...`);
      for (const room of expiredRooms) {
        room.status = 'AVAILABLE';
        room.heldBy = null;
        room.heldUntil = null;
        await room.save();

        if (io) {
          io.emit('room_status_changed', {
            roomId: room._id,
            roomNumber: room.number,
            status: 'AVAILABLE',
            heldBy: null,
            heldUntil: null,
            message: `Hold on Room ${room.number} expired and is now available.`,
          });
        }
      }
    }
  } catch (err) {
    console.error('[Timer] Error cleaning expired holds:', err.message);
  }
};

module.exports = { seedRooms, cleanupExpiredHolds };
