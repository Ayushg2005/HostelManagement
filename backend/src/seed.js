const mongoose = require('mongoose');
const User = require('./models/User');
const Room = require('./models/Room');
const MenuItem = require('./models/MenuItem');
const Complaint = require('./models/Complaint');
const LeaveLog = require('./models/LeaveLog');
const Order = require('./models/Order');

const seedData = async () => {
  try {
    console.log('🌱 Seeding database...');

    // Clear existing collections
    await User.deleteMany({});
    await Room.deleteMany({});
    await MenuItem.deleteMany({});
    await Complaint.deleteMany({});
    await LeaveLog.deleteMany({});
    await Order.deleteMany({});

    // 1. Create Demo Users
    const student1 = await User.create({
      name: 'Alex Student',
      email: 'alex.cs26@bmsce.ac.in',
      password: 'password123',
      role: 'STUDENT',
      rollNumber: 'CS202601',
    });

    const student2 = await User.create({
      name: 'Sarah Connor',
      email: 'sarah.cs26@bmsce.ac.in',
      password: 'password123',
      role: 'STUDENT',
      rollNumber: 'CS202602',
    });

    const admin = await User.create({
      name: 'Dr. Warden Smith',
      email: 'warden@bmsce.ac.in',
      password: 'password123',
      role: 'ADMIN',
      rollNumber: 'WARDEN-01',
    });

    const cook = await User.create({
      name: 'Master Chef Roy',
      email: 'canteen@bmsce.ac.in',
      password: 'password123',
      role: 'COOK',
      rollNumber: 'CANTEEN-01',
    });

    console.log('✅ Demo Users Seeded (student@hostel.com, admin@hostel.com, canteen@bmsce.ac.in)');

    // 2. Create 150 Single-Occupancy Rooms
    const roomsToInsert = [];
    for (let i = 1; i <= 150; i++) {
      let floor = 1;
      if (i > 50 && i <= 100) floor = 2;
      else if (i > 100) floor = 3;
      
      roomsToInsert.push({
        number: String(i),
        floor: floor,
        capacity: 1,
        status: 'AVAILABLE',
      });
    }

    // Mark Room 1 as occupied by student2 for realistic initial state
    const insertedRooms = await Room.insertMany(roomsToInsert);
    const room1 = insertedRooms.find((r) => String(r.number) === '1');
    if (room1) {
      room1.status = 'OCCUPIED';
      room1.occupiedBy = student2._id;
      room1.bookedAt = new Date();
      await room1.save();
      student2.roomId = room1._id;
      await student2.save();
    }

    console.log(`✅ 150 Single-Occupancy Rooms Seeded (Rooms 1 to 150)`);

    // 3. Create Canteen Menu Items
    const menuItems = [
      { name: 'Midnight Masala Maggi', price: 40, category: 'Snacks', available: true, imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80' },
      { name: 'Paneer Butter Roll', price: 70, category: 'Snacks', available: true, imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=400&q=80' },
      { name: 'Cheese Garlic Toast', price: 60, category: 'Snacks', available: true, imageUrl: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?auto=format&fit=crop&w=400&q=80' },
      { name: 'Iced Cold Coffee', price: 50, category: 'Beverages', available: true, imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=400&q=80' },
      { name: 'Kulhad Hot Chai', price: 20, category: 'Beverages', available: true, imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80' },
      { name: 'Egg Burji with Paratha', price: 80, category: 'Main Course', available: true, imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80' },
      { name: 'Sizzling Chocolate Brownie', price: 90, category: 'Desserts', available: true, imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=80' },
      { name: 'Chicken Biryani Mini', price: 120, category: 'Main Course', available: true, imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80' },
      { name: 'Veg Fried Rice', price: 70, category: 'Main Course', available: true, imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&q=80' },
      { name: 'Oreo Milkshake', price: 70, category: 'Beverages', available: true, imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=400&q=80' }
    ];

    await MenuItem.insertMany(menuItems);
    console.log('✅ Night Canteen Menu Seeded (10 items)');

    // 4. Create Sample Complaint
    await Complaint.create({
      student: student2._id,
      category: 'BATHROOM',
      subIssue: 'Hot water geyser not heating properly',
      remarks: 'Please inspect the heating coil in Room 101 washroom.',
      status: 'RAISED',
    });

    // 5. Create Sample Leave Log
    await LeaveLog.create({
      student: student2._id,
      type: 'LATE_ENTRY',
      startDate: new Date(),
      reason: 'Library study session for exam prep',
      status: 'APPROVED',
    });

    console.log('🎉 Seed database completed successfully!');
  } catch (error) {
    console.error('❌ Error Seeding Data:', error.message);
  }
};

module.exports = seedData;

// Execute if run directly
if (require.main === module) {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostel_management';
  mongoose.connect(mongoUri)
    .then(() => seedData())
    .then(() => {
      console.log('Seed script finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
