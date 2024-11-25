const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'gif', 'audio', 'url'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  metadata: {
    fileName: String,
    resolution: String,
    format: String,
    fps: Number,
    duration: String,
    siteName: String,
    description: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Memory', memorySchema);
