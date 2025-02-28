const Notification = require('../models/Notification');

module.exports = (io, socket) => {
  // Mark notification as read
  socket.on('markNotificationRead', async ({ notificationId }) => {
    const notification = await Notification.findById(notificationId);
    
    if (!notification || notification.recipient.toString() !== socket.user.id) {
      return;
    }
    
    notification.read = true;
    await notification.save();
    
    socket.emit('notificationMarkedRead', { notificationId });
  });
  
  // Mark all notifications as read
  socket.on('markAllNotificationsRead', async () => {
    await Notification.updateMany(
      { recipient: socket.user.id, read: false },
      { read: true }
    );
    
    socket.emit('allNotificationsMarkedRead');
  });
  
  // Get unread notification count
  socket.on('getUnreadNotificationCount', async () => {
    const count = await Notification.countDocuments({
      recipient: socket.user.id,
      read: false
    });
    
    socket.emit('unreadNotificationCount', { count });
  });
};