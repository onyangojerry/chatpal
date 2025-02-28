const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DrawingSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group'
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  canvasData: {
    type: String
  },
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  message: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Drawing', DrawingSchema);