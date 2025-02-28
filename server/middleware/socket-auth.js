const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function(socket, next) {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Update user status to online
    await User.findByIdAndUpdate(decoded.user.id, {
      status: 'online',
      lastActive: Date.now()
    });
    
    // Add user info to socket
    socket.user = decoded.user;
    
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};