const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['image', 'gif', 'audio', 'url', 'text']
  },
  url: {
    type: String,
    required: function() {
      return ['image', 'gif', 'audio', 'url'].includes(this.type);
    }
  },
  content: {
    type: String,
    required: function() {
      return this.type === 'text';
    }
  },
  metadata: {
    fileName: String,
    format: String,
    siteName: String,
    title: String,
    description: String,
    thumbnailUrl: String,
    createdAt: Date
  },
  votes: {
    up: { type: Number, default: 0 },
    down: { type: Number, default: 0 }
  },
  tags: [String]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Ensure either url or content is provided based on type
memorySchema.pre('save', function(next) {
  if ((this.type !== 'text' && !this.url) || (this.type === 'text' && !this.content)) {
    next(new Error('Either url or content must be provided based on memory type'));
  }
  next();
});

module.exports = mongoose.model('Memory', memorySchema);
