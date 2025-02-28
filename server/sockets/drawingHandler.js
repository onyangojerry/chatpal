const Drawing = require('../models/Drawing');
const Group = require('../models/Group');
const Notification = require('../models/Notification');

module.exports = (io, socket) => {
  // Join a drawing room
  socket.on('joinDrawing', async ({ drawingId }) => {
    socket.join(`drawing:${drawingId}`);
    
    // Track active participants
    const drawing = await Drawing.findByIdAndUpdate(
      drawingId,
      { $addToSet: { participants: socket.user.id } },
      { new: true }
    ).populate('participants', 'name');
    
    if (drawing) {
      // Broadcast updated participants list
      io.to(`drawing:${drawingId}`).emit('drawingParticipants', {
        participants: drawing.participants.map(user => ({
          id: user._id,
          name: user.name
        }))
      });
    }
  });
  
  // Leave a drawing room
  socket.on('leaveDrawing', async ({ drawingId }) => {
    socket.leave(`drawing:${drawingId}`);
    
    // Remove from active participants
    const drawing = await Drawing.findByIdAndUpdate(
      drawingId,
      { $pull: { participants: socket.user.id } },
      { new: true }
    ).populate('participants', 'name');
    
    if (drawing) {
      // Broadcast updated participants list
      io.to(`drawing:${drawingId}`).emit('drawingParticipants', {
        participants: drawing.participants.map(user => ({
          id: user._id,
          name: user.name
        }))
      });
    }
  });
  
  // Handle drawing actions
  socket.on('drawingAction', (data) => {
    // Broadcast to all users in the drawing room except sender
    socket.to(`drawing:${data.drawingId}`).emit('drawingAction', {
      ...data,
      userId: socket.user.id,
      userName: socket.user.name
    });
  });
  
  // Save drawing
  socket.on('saveDrawing', async ({ drawingId, canvasData }) => {
    if (!canvasData) return;
    
    const drawing = await Drawing.findByIdAndUpdate(drawingId, {
      canvasData,
      lastModified: new Date()
    }, { new: true });
    
    // Notify group if drawing is attached to a group
    if (drawing && drawing.group) {
      socket.to(`group:${drawing.group}`).emit('drawingUpdated', {
        drawingId,
        updatedBy: {
          id: socket.user.id,
          name: socket.user.name
        }
      });
      
      // Create notifications for group members
      const group = await Group.findById(drawing.group);
      
      if (group) {
        const notifications = group.members
          .filter(member => 
            member.user.toString() !== socket.user.id && 
            !drawing.participants.includes(member.user)
          )
          .map(member => ({
            recipient: member.user,
            sender: socket.user.id,
            type: 'drawingUpdate',
            drawing: drawingId,
            group: drawing.group,
            content: `Drawing "${drawing.title}" was updated`,
          }));
        
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
          
          notifications.forEach(notification => {
            io.to(notification.recipient.toString()).emit('newNotification', notification);
          });
        }
      }
    }
  });
  
  // Clear drawing
  socket.on('clearDrawing', async ({ drawingId }) => {
    socket.to(`drawing:${drawingId}`).emit('clearDrawing');
    
    await Drawing.findByIdAndUpdate(drawingId, {
      canvasData: null,
      lastModified: new Date()
    });
  });
};