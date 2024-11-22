const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['url', 'image', 'video', 'audio', 'text', 'static']
  },
  url: {
    type: String,
    required: function() {
      return this.type === 'url' || this.type === 'image' || this.type === 'video' || this.type === 'audio';
    }
  },
  content: {
    type: String,
    required: function() {
      return this.type === 'text';
    }
  },
  metadata: {
    title: String,
    description: String,
    siteName: String,
    favicon: String,
    mediaType: {
      type: String,
      enum: ['url', 'image', 'video', 'audio', 'static']
    },
    previewUrl: String,
    playbackHtml: String,
    isPlayable: Boolean,
    fileSize: Number,
    contentType: String,
    resolution: String,
    duration: String,
    format: String,
    encoding: String,
    lastModified: Date
  },
  tags: [String],
  votes: {
    type: Number,
    default: 0,
    required: true
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.createdAt = ret.createdAt.toISOString();
      ret.updatedAt = ret.updatedAt.toISOString();
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

module.exports = mongoose.model('Memory', memorySchema);
