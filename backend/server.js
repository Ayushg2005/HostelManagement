const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const roomRoutes = require('./src/routes/roomRoutes');
const configRoutes = require('./src/routes/configRoutes');
const complaintRoutes = require('./src/routes/complaintRoutes');
const leaveRoutes = require('./src/routes/leaveRoutes');
const canteenRoutes = require('./src/routes/canteen');
const { seedRooms } = require('./src/utils/seedRooms');
const initRoomSocketService = require('./src/services/roomSocket');

// Load env vars
dotenv.config();

const seedData = require('./src/seed');

// Connect Database
connectDB().then(() => {
  // Seed entire mock database after DB connection (important for MemoryServer)
  setTimeout(async () => {
    await seedData();
    seedRooms(io);
  }, 1500);
});

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Setup Socket.io for Real-Time features
const io = new Server(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Pass io to request object (replaces app.set('io', io) for consistency)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Initialize Room WebSocket background scanner
initRoomSocketService(io);

// Middleware
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Store io instance on app for use in controllers
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/config', configRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/canteen', canteenRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    system: 'Hostel Management System API',
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Hostel Management API running on port ${PORT}`);
  console.log(`🔗 Allowed CORS origin: ${CLIENT_URL}`);
  console.log(`==================================================`);
});
