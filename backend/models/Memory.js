const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'gif', 'audio', 'video', 'url'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  metadata: {
    title: String,
    description: String,
    fileName: String,
    resolution: String,
    format: String,
    fps: Number,
    duration: String,
    siteName: String,
    mediaType: String,
    platform: String,
    embedHtml: String,
    thumbnailUrl: String,
    previewUrl: String,
    width: Number,
    height: Number,
    isDiscordCdn: Boolean,
    expiresAt: Date,
    favicon: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Memory', memorySchema);
