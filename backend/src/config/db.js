const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostel_management';
    
    // Set connection timeout to 15 seconds to allow cloud connection
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });
    
    console.log(`[Database] Connected to MongoDB at ${mongoose.connection.host}`);
  } catch (err) {
    console.warn('[Database] Original Connection Error:', err.message);
    console.warn('[Database] Could not connect to MongoDB. Starting MongoMemoryServer fallback...');
    try {
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log(`[Database] Connected to MongoMemoryServer in-memory DB at ${uri}`);
    } catch (memErr) {
      console.error('[Database] Failed to initialize in-memory MongoDB:', memErr.message);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
