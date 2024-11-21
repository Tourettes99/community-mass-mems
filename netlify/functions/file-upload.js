const mongoose = require('mongoose');
const { Buffer } = require('buffer');
const Sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');
const zlib = require('zlib');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

const DB_NAME = 'memories';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Memory Schema
const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['url', 'image', 'video', 'audio', 'text', 'static'],
    required: true
  },
  url: String,
  content: String,
  tags: [String],
  metadata: {
    title: String,
    description: String,
    siteName: String,
    favicon: String,
    mediaType: String,
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
    rawContent: String
  }
}, { timestamps: true });

// Initialize MongoDB connection
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 5000
    });

    cachedDb = connection;
    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Initialize Memory model
let Memory;
try {
  Memory = mongoose.model('Memory');
} catch {
  Memory = mongoose.model('Memory', memorySchema);
}

exports.handler = async (event, context) => {
  // Make sure to close the DB connection when the function exits
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Connect to MongoDB
    await connectToDatabase();

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request body' })
      };
    }

    // Validate required fields
    if (!body.type || !['url', 'image', 'video', 'audio', 'text', 'static'].includes(body.type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid memory type' })
      };
    }

    // Create memory object
    const memoryData = {
      type: body.type,
      url: body.url,
      content: body.content,
      tags: body.tags || []
    };

    // Add metadata based on type
    if (body.type === 'url' && body.url) {
      try {
        memoryData.metadata = {
          title: body.url,
          mediaType: 'url'
        };
      } catch (error) {
        console.error('Error fetching URL metadata:', error);
      }
    } else if (body.type === 'text' && body.content) {
      memoryData.metadata = {
        title: body.content.slice(0, 50) + (body.content.length > 50 ? '...' : ''),
        mediaType: 'text',
        description: body.content
      };
    }

    console.log('Creating new memory:', JSON.stringify(memoryData, null, 2));
    const memory = new Memory(memoryData);
    const savedMemory = await memory.save();
    console.log('Memory saved successfully:', savedMemory._id);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Memory created successfully',
        memory: savedMemory
      })
    };
  } catch (error) {
    console.error('Error processing request:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
