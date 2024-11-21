const mongoose = require('mongoose');
const { connectToDatabase } = require('./mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

const DB_NAME = 'memories';

// Memory Schema (same as in upload.js)
const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'gif', 'video', 'audio', 'document', 'url', 'text', 'social'],
    required: true
  },
  url: String,
  content: String,
  metadata: {
    // Basic metadata
    title: String,
    description: String,
    siteName: String,
    author: String,
    publishedDate: Date,
    modifiedDate: Date,
    language: String,
    
    // Media metadata
    fileName: String,
    resolution: String,
    format: String,
    fps: Number,
    duration: String,
    bitrate: String,
    codec: String,
    contentType: String,
    size: {
      original: Number,
      compressed: Number
    },
    dimensions: {
      width: Number,
      height: Number
    },
    
    // Media and preview information
    mediaType: String,
    previewType: String,
    previewUrl: String,
    playbackHtml: String,
    isPlayable: Boolean,
    
    // Open Graph metadata
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    ogType: String,
    ogUrl: String,
    
    // Twitter Card metadata
    twitterCard: String,
    twitterTitle: String,
    twitterDescription: String,
    twitterImage: String,
    twitterCreator: String,
    
    // Article metadata
    articleSection: String,
    articleTags: [String],
    articlePublisher: String,
    
    // Custom metadata
    tags: [String],
    category: String,
    userNotes: String,
    customFields: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

// Create the Memory model
let Memory;
try {
  Memory = mongoose.model('Memory');
} catch {
  Memory = mongoose.model('Memory', memorySchema);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

exports.handler = async (event, context) => {
  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const db = await connectToDatabase();
    const memories = db.collection('memories');

    // Parse query parameters
    const { tags, type, limit = 20, skip = 0 } = event.queryStringParameters || {};

    // Build query
    const query = {};
    if (tags) {
      query.tags = { $in: tags.split(',') };
    }
    if (type) {
      query.type = type;
    }

    // Get total count for pagination
    const total = await memories.countDocuments(query);

    // Fetch memories with pagination
    const items = await memories
      .find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      })
    };
  } catch (error) {
    console.error('Error fetching memories:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
