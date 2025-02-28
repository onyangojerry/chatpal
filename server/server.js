const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');
const socketAuth = require('./middleware/socket-auth');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const groupRoutes = require('./routes/groups');
const tableRoutes = require('./routes/tables');
const drawingRoutes = require('./routes/drawings');
const notificationRoutes = require('./routes/notifications');

// Import socket handlers
const chatHandler = require('./sockets/chatHandler');
const drawingHandler = require('./sockets/drawingHandler');
const tableHandler = require('./sockets/tableHandler');
const notificationHandler = require('./sockets/notificationHandler');

// Load environment variables
require('dotenv').config();

// Connect to database
connectDB();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketio(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io middleware for authentication
io.use(socketAuth);

// Socket.io connection handler
io.on('connection', socket => {
  console.log(`User connected: ${socket.user.id}`);
  
  // Join user to their personal room
  socket.join(socket.user.id);
  
  // Set up socket handlers
  chatHandler(io, socket);
  drawingHandler(io, socket);
  tableHandler(io, socket);
  notificationHandler(io, socket);
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.id}`);
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/drawings', drawingRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));