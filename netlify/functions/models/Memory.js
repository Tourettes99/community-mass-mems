const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['image', 'gif', 'audio', 'url']
  },
  url: {
    type: String,
    required: true
  },
  metadata: {
    fileName: String,
    format: String,
    siteName: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Memory', memorySchema);
