const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['url', 'text', 'image', 'video', 'audio', 'document']
  },
  url: {
    type: String,
    required: function() {
      return this.type === 'url' || this.type === 'image' || this.type === 'video' || this.type === 'audio' || this.type === 'document';
    }
  },
  content: {
    type: String,
    required: function() {
      return this.type === 'text';
    }
  },
  tags: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  submittedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  metadata: {
    title: String,
    description: String,
    thumbnailUrl: String,
    mediaType: String,
    platform: String,
    contentUrl: String,
    fileType: String,
    domain: String,
    isSecure: Boolean,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    favicon: String,
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    ogType: String,
    twitterTitle: String,
    twitterDescription: String,
    twitterImage: String,
    twitterCard: String
  },
  votes: {
    up: {
      type: Number,
      default: 0
    },
    down: {
      type: Number,
      default: 0
    }
  },
  userVotes: {
    type: Map,
    of: String,
    default: new Map()
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Format dates as ISO strings
      if (ret.metadata) {
        ret.metadata.createdAt = ret.metadata.createdAt ? new Date(ret.metadata.createdAt).toISOString() : null;
        ret.metadata.updatedAt = ret.metadata.updatedAt ? new Date(ret.metadata.updatedAt).toISOString() : null;
      }
      // Transform _id to id
      ret.id = ret._id.toString();
      delete ret._id;
      // Remove MongoDB-specific fields
      delete ret.__v;
      // Convert userVotes Map to object for JSON
      if (ret.userVotes instanceof Map) {
        ret.userVotes = Object.fromEntries(ret.userVotes);
      }
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      if (!(ret.userVotes instanceof Map)) {
        ret.userVotes = new Map(Object.entries(ret.userVotes || {}));
      }
      return ret;
    }
  }
});

// Update metadata timestamps before saving
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
