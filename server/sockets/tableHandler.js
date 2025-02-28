const Table = require('../models/Table');
const Group = require('../models/Group');
const Notification = require('../models/Notification');

module.exports = (io, socket) => {
  const activeTableUsers = {};
  
  // Join a table room
  socket.on('joinTable', ({ tableId }) => {
    socket.join(`table:${tableId}`);
    
    // Track active users
    if (!activeTableUsers[tableId]) {
      activeTableUsers[tableId] = [];
    }
    
    const userExists = activeTableUsers[tableId].some(user => user.id === socket.user.id);
    
    if (!userExists) {
      activeTableUsers[tableId].push({
        id: socket.user.id,
        name: socket.user.name,
        socket: socket.id
      });
    }
    
    // Broadcast active users to all clients in table room
    io.to(`table:${tableId}`).emit('tableActiveUsers', 
      activeTableUsers[tableId].map(user => ({
        id: user.id,
        name: user.name
      }))
    );
  });
  
  // Leave a table room
  socket.on('leaveTable', ({ tableId }) => {
    socket.leave(`table:${tableId}`);
    
    // Remove user from active users
    if (activeTableUsers[tableId]) {
      activeTableUsers[tableId] = activeTableUsers[tableId].filter(
        user => user.id !== socket.user.id
      );
      
      // Broadcast updated active users list
      io.to(`table:${tableId}`).emit('tableActiveUsers', 
        activeTableUsers[tableId].map(user => ({
          id: user.id,
          name: user.name
        }))
      );
    }
  });
  
  // Handle cell updates
  socket.on('updateCell', async ({ tableId, rowIndex, colIndex, value }) => {
    const table = await Table.findById(tableId);
    
    if (!table) {
      return socket.emit('error', { message: 'Table not found' });
    }
    
    // Ensure rows array has enough rows
    while (table.rows.length <= rowIndex) {
      const newRow = Array(table.columns.length).fill('');
      table.rows.push(newRow);
    }
    
    // Update the specific cell
    if (!table.rows[rowIndex]) {
      table.rows[rowIndex] = [];
    }
    
    table.rows[rowIndex][colIndex] = value;
    table.lastModified = new Date();
    
    await table.save();
    
    // Broadcast update to all users in the table
    socket.to(`table:${tableId}`).emit('cellUpdate', {
      rowIndex,
      colIndex,
      value,
      updatedBy: {
        id: socket.user.id,
        name: socket.user.name
      }
    });
    
    // Notify group if table is attached to a group
    if (table.group) {
      // Create notifications for group members
      const group = await Group.findById(table.group);
      
      if (group) {
        // Get active table users IDs
        const activeUserIds = (activeTableUsers[tableId] || []).map(user => user.id);
        
        const notifications = group.members
          .filter(member => 
            member.user.toString() !== socket.user.id && 
            !activeUserIds.includes(member.user.toString())
          )
          .map(member => ({
            recipient: member.user,
            sender: socket.user.id,
            type: 'tableUpdate',
            table: tableId,
            group: table.group,
            content: `Table "${table.title}" was updated`,
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
  
  // Notify when a cell is being edited
  socket.on('cellEditing', ({ tableId, rowIndex, colIndex }) => {
    socket.to(`table:${tableId}`).emit('cellEditing', {
      rowIndex,
      colIndex,
      user: {
        id: socket.user.id,
        name: socket.user.name
      }
    });
  });
  
  // Add a new column
  socket.on('addColumn', async ({ tableId, columnName }) => {
    const table = await Table.findById(tableId);
    
    if (!table) {
      return socket.emit('error', { message: 'Table not found' });
    }
    
    // Add the new column definition
    table.columns.push({
      name: columnName,
      type: 'text'
    });
    
    // Add an empty cell for this column to each existing row
    table.rows.forEach(row => {
      row.push('');
    });
    
    table.lastModified = new Date();
    await table.save();
    
    // Broadcast the updated table to all users
    io.to(`table:${tableId}`).emit('tableUpdate', table);
  });
  
  // Add a new row
  socket.on('addRow', async ({ tableId }) => {
    const table = await Table.findById(tableId);
    
    if (!table) {
      return socket.emit('error', { message: 'Table not found' });
    }
    
    // Create a new empty row with cells for each column
    const newRow = Array(table.columns.length).fill('');
    table.rows.push(newRow);
    
    table.lastModified = new Date();
    await table.save();
    
    // Broadcast the updated table to all users
    io.to(`table:${tableId}`).emit('tableUpdate', table);
  });
  
  // Clean up when socket disconnects
  socket.on('disconnect', () => {
    // Remove user from all active tables
    Object.keys(activeTableUsers).forEach(tableId => {
      activeTableUsers[tableId] = activeTableUsers[tableId].filter(
        user => user.id !== socket.user.id
      );
      
      // Broadcast updated active users list
      io.to(`table:${tableId}`).emit('tableActiveUsers', 
        activeTableUsers[tableId].map(user => ({
          id: user.id,
          name: user.name
        }))
      );
    });
  });
};