const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  type: {
    type: String,
<<<<<<< HEAD
    enum: ['image', 'gif', 'audio', 'url'],
=======
    enum: ['image', 'gif', 'audio', 'video', 'url'],
>>>>>>> 2d4727ca882ad7f101b4675d9db26b68336e61fb
    required: true
  },
  url: {
    type: String,
    required: true
  },
  metadata: {
<<<<<<< HEAD
=======
    title: String,
    description: String,
>>>>>>> 2d4727ca882ad7f101b4675d9db26b68336e61fb
    fileName: String,
    resolution: String,
    format: String,
    fps: Number,
    duration: String,
    siteName: String,
<<<<<<< HEAD
    description: String
=======
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
>>>>>>> 2d4727ca882ad7f101b4675d9db26b68336e61fb
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Memory', memorySchema);
