require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { DBconnect } = require('./DBconnect');

const authUser = require('./Routes/authUser');
const authRequest = require('./Routes/authRequest');
const authAttendance = require('./Routes/authAttendance');
const authTeams = require("./Routes/authTeams");
const authNotification = require("./Routes/authNotification");

const port = process.env.PORT || 5000;
const server = http.createServer(app);

// 🔌 SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173', 
      'https://work-orbit-frontend.vercel.app',
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 🔐 Socket.io Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    console.log(`✅ Socket authenticated: ${socket.userId} (${socket.userRole})`);
    next();
  } catch (err) {
    console.error('❌ Socket auth failed:', err.message);
    next(new Error('Authentication error'));
  }
});

// 👥 Track connected users
const connectedUsers = new Map(); // userId -> socketId

// 🔌 Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.userId}`);
  
  // Store user's socket connection
  connectedUsers.set(socket.userId, socket.id);
  
  // Join user's personal room
  socket.join(`user:${socket.userId}`);
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.userId}`);
    connectedUsers.delete(socket.userId);
  });
  
  // Ping-pong to keep connection alive
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// 🌐 Make io accessible to routes
app.set('io', io);

const corsOptions = {
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173', 
    'https://work-orbit-frontend.vercel.app',
    'http://localhost:5173'
  ],
  methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date(),
    uptime: process.uptime(),
    connectedUsers: connectedUsers.size
  });
});

DBconnect();

app.use('/api/auth', authUser);
app.use('/api/request', authRequest);
app.use('/api/attendance', authAttendance);
app.use("/api/team", authTeams);
app.use("/api/notification", authNotification);

mongoose.connection.once('open', () => {
  console.log("✅ Connected to Database!");
  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🔌 Socket.io server ready`);
  });
});

module.exports = { io, connectedUsers };