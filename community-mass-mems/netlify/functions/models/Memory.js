const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['url', 'text', 'image', 'video', 'audio']
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
    basicInfo: {
      title: String,
      description: String,
      mediaType: String,
      thumbnailUrl: String,
      platform: String,
      contentUrl: String,
      fileType: String,
      domain: String,
      isSecure: Boolean
    },
    embed: {
      embedUrl: String,
      embedHtml: String,
      embedType: String
    },
    timestamps: {
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    },
    tags: [String]
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  votes: {
    up: { type: Number, default: 0 },
    down: { type: Number, default: 0 }
  },
  userVotes: {
    type: Map,
    of: String,
    default: new Map()
  }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      if (!ret.metadata) {
        ret.metadata = {
          basicInfo: {},
          embed: {},
          timestamps: {},
          tags: []
        };
      }
      
      if (ret.metadata.embed && ret.metadata.embed.embedHtml) {
        ret.metadata.embed.embedHtml = ret.metadata.embed.embedHtml
          .replace(/javascript:/gi, '')
          .replace(/onerror=/gi, '')
          .replace(/onclick=/gi, '');
      }

      if (ret.metadata.timestamps) {
        ret.metadata.timestamps.createdAt = ret.metadata.timestamps.createdAt ? 
          new Date(ret.metadata.timestamps.createdAt).toISOString() : 
          new Date().toISOString();
        ret.metadata.timestamps.updatedAt = ret.metadata.timestamps.updatedAt ? 
          new Date(ret.metadata.timestamps.updatedAt).toISOString() : 
          new Date().toISOString();
      }

      ret.id = ret._id.toString();
      delete ret._id;

      return ret;
    }
  }
});

// Add indexes
memorySchema.index({ type: 1 });
memorySchema.index({ status: 1 });
memorySchema.index({ 'metadata.tags': 1 });
memorySchema.index({ createdAt: -1 });
memorySchema.index({ 'metadata.basicInfo.platform': 1 });
memorySchema.index({ 'metadata.basicInfo.mediaType': 1 });

// Update timestamps before saving
memorySchema.pre('save', function(next) {
  const now = new Date();
  if (!this.metadata) {
    this.metadata = {
      basicInfo: {},
      embed: {},
      timestamps: {},
      tags: []
    };
  }
  if (!this.metadata.timestamps) {
    this.metadata.timestamps = {};
  }
  if (this.isNew) {
    this.metadata.timestamps.createdAt = now;
  }
  this.metadata.timestamps.updatedAt = now;
  next();
});

const Memory = mongoose.model('Memory', memorySchema);

module.exports = Memory;
