const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ThreadSchema = new Schema({
  parentMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Thread', ThreadSchema);