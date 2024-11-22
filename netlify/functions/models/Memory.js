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
    lastModified: Date,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  tags: [String],
  votes: {
    up: {
      type: Number,
      default: 0
    },
    down: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Ensure dates are in ISO format
      if (ret.metadata) {
        ret.metadata.createdAt = ret.createdAt ? ret.createdAt.toISOString() : null;
        ret.metadata.updatedAt = ret.updatedAt ? ret.updatedAt.toISOString() : null;
      }
      // Remove internal MongoDB fields
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Update timestamps in metadata before saving
memorySchema.pre('save', function(next) {
  if (this.isModified()) {
    const now = new Date();
    if (!this.metadata) {
      this.metadata = {};
    }
    if (this.isNew) {
      this.metadata.createdAt = now;
    }
    this.metadata.updatedAt = now;
  }
  next();
});

const Memory = mongoose.model('Memory', memorySchema);

module.exports = Memory;
