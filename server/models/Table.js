const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TableSchema = new Schema({
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
  columns: [
    {
      name: String,
      type: {
        type: String,
        enum: ['text', 'number', 'date', 'boolean'],
        default: 'text'
      }
    }
  ],
  rows: [[String]],  // Array of arrays (2D array)
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

module.exports = mongoose.model('Table', TableSchema);