const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['newMessage', 'mention', 'groupInvite', 'threadReply', 'tableUpdate', 'drawingUpdate'],
    required: true
  },
  message: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group'
  },
  thread: {
    type: Schema.Types.ObjectId,
    ref: 'Thread'
  },
  table: {
    type: Schema.Types.ObjectId,
    ref: 'Table'
  },
  drawing: {
    type: Schema.Types.ObjectId,
    ref: 'Drawing'
  },
  content: {
    type: String
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);