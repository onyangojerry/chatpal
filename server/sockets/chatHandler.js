const User = require('../models/User');
const Group = require('../models/Group');
const Message = require('../models/Message');
const Thread = require('../models/Thread');
const Notification = require('../models/Notification');

module.exports = (io, socket) => {
  // Join a chat group
  socket.on('joinGroup', async ({ groupId }) => {
    socket.join(`group:${groupId}`);
    
    // Notify other users about new user joining
    socket.to(`group:${groupId}`).emit('userJoined', {
      user: {
        id: socket.user.id,
        name: socket.user.name
      }
    });
    
    // Update user's online status
    await User.findByIdAndUpdate(socket.user.id, { 
      status: 'online',
      lastActive: new Date()
    });
    
    // Broadcast updated user list
    const group = await Group.findById(groupId).populate('members.user', 'name status');
    
    io.to(`group:${groupId}`).emit('groupUsers', {
      users: group.members.map(m => ({
        id: m.user._id,
        name: m.user.name,
        status: m.user.status,
        role: m.role
      }))
    });
  });
  
  // Leave a chat group
  socket.on('leaveGroup', ({ groupId }) => {
    socket.leave(`group:${groupId}`);
    
    // Notify other users
    socket.to(`group:${groupId}`).emit('userLeft', {
      user: {
        id: socket.user.id,
        name: socket.user.name
      }
    });
  });
  
  // Send a message to a group
  socket.on('sendMessage', async (data) => {
    const { groupId, content, attachments = [] } = data;
    
    // Save message to database
    const newMessage = new Message({
      group: groupId,
      sender: socket.user.id,
      content,
      attachments,
      readBy: [{ user: socket.user.id }]
    });
    
    await newMessage.save();
    
    // Populate sender info for the response
    await newMessage.populate('sender', 'name avatar');
    
    // Broadcast to all clients in the group
    io.to(`group:${groupId}`).emit('newMessage', newMessage);
    
    // Create notifications for all group members
    const group = await Group.findById(groupId);
    
    // Send notifications to all members except sender
    const notifications = group.members
      .filter(member => member.user.toString() !== socket.user.id)
      .map(member => ({
        recipient: member.user,
        sender: socket.user.id,
        type: 'newMessage',
        message: newMessage._id,
        group: groupId,
        content: `New message from ${socket.user.name} in ${group.name}`,
      }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      
      // Notify users about new notifications
      notifications.forEach(notification => {
        io.to(notification.recipient.toString()).emit('newNotification', notification);
      });
    }
  });
  
  // Start a thread on a message
  socket.on('startThread', async ({ messageId, content }) => {
    const parentMessage = await Message.findById(messageId);
    
    if (!parentMessage) {
      return socket.emit('error', { message: 'Message not found' });
    }
    
    // Create a new thread if it doesn't exist
    let thread;
    if (!parentMessage.thread) {
      thread = new Thread({
        parentMessage: parentMessage._id,
        group: parentMessage.group,
        participants: [socket.user.id, parentMessage.sender]
      });
      
      await thread.save();
      
      // Update parent message with thread reference
      parentMessage.thread = thread._id;
      await parentMessage.save();
    } else {
      thread = await Thread.findById(parentMessage.thread);
      
      // Add user to participants if not already included
      if (!thread.participants.includes(socket.user.id)) {
        thread.participants.push(socket.user.id);
        await thread.save();
      }
    }
    
    // Create a new message in the thread
    const newMessage = new Message({
      group: parentMessage.group,
      sender: socket.user.id,
      content,
      parentMessage: parentMessage._id,
      thread: thread._id,
      readBy: [{ user: socket.user.id }]
    });
    
    await newMessage.save();
    await newMessage.populate('sender', 'name avatar');
    
    // Update thread's last activity
    thread.lastActivity = new Date();
    await thread.save();
    
    // Notify thread participants
    io.to(`thread:${thread._id}`).emit('threadMessage', newMessage);
    
    // Create notifications for thread participants
    const notifications = thread.participants
      .filter(participant => participant.toString() !== socket.user.id)
      .map(participant => ({
        recipient: participant,
        sender: socket.user.id,
        type: 'threadReply',
        message: newMessage._id,
        thread: thread._id,
        group: parentMessage.group,
        content: `New reply in thread`,
      }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      
      // Notify users about new notifications
      notifications.forEach(notification => {
        io.to(notification.recipient.toString()).emit('newNotification', notification);
      });
    }
  });
  
  // Send a message to a thread
  socket.on('sendThreadMessage', async ({ threadId, content, parentId }) => {
    const thread = await Thread.findById(threadId);
    
    if (!thread) {
      return socket.emit('error', { message: 'Thread not found' });
    }
    
    // Create a new message in the thread
    const newMessage = new Message({
      group: thread.group,
      sender: socket.user.id,
      content,
      parentMessage: parentId,
      thread: threadId,
      readBy: [{ user: socket.user.id }]
    });
    
    await newMessage.save();
    await newMessage.populate('sender', 'name avatar');
    
    // Update thread's last activity
    thread.lastActivity = new Date();
    
    // Add user to participants if not already included
    if (!thread.participants.includes(socket.user.id)) {
      thread.participants.push(socket.user.id);
    }
    
    await thread.save();
    
    // Notify thread participants
    io.to(`thread:${threadId}`).emit('threadMessage', newMessage);
    
    // Create notifications for thread participants
    const notifications = thread.participants
      .filter(participant => participant.toString() !== socket.user.id)
      .map(participant => ({
        recipient: participant,
        sender: socket.user.id,
        type: 'threadReply',
        message: newMessage._id,
        thread: threadId,
        group: thread.group,
        content: `New reply in thread`,
      }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      
      // Notify users about new notifications
      notifications.forEach(notification => {
        io.to(notification.recipient.toString()).emit('newNotification', notification);
      });
    }
  });
  
  // Join a thread
  socket.on('joinThread', ({ threadId }) => {
    socket.join(`thread:${threadId}`);
  });
  
  // Leave a thread
  socket.on('leaveThread', ({ threadId }) => {
    socket.leave(`thread:${threadId}`);
  });
  
  // Mark messages as read
  socket.on('markAsRead', async ({ messageIds }) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return;
    
    await Message.updateMany(
      { _id: { $in: messageIds }, 'readBy.user': { $ne: socket.user.id } },
      { $push: { readBy: { user: socket.user.id, readAt: new Date() } } }
    );
    
    // Notify group about read status update
    const messages = await Message.find({ _id: { $in: messageIds } }).distinct('group');
    
    messages.forEach(groupId => {
      io.to(`group:${groupId}`).emit('messagesRead', {
        messageIds,
        user: {
          id: socket.user.id,
          name: socket.user.name
        }
      });
    });
  });
};