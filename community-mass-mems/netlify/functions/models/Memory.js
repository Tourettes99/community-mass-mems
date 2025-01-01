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
    default: 'pending'
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
  versionKey: false
});

// Add indexes
memorySchema.index({ type: 1 });
memorySchema.index({ status: 1 });
memorySchema.index({ 'metadata.tags': 1 });
memorySchema.index({ createdAt: -1 });

const Memory = mongoose.model('Memory', memorySchema);

module.exports = Memory;
