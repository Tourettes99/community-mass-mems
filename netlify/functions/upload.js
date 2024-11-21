const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

const DB_NAME = 'memories';

// Memory Schema
const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'gif', 'video', 'audio', 'document', 'url'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  metadata: {
    fileName: String,
    resolution: String,
    format: String,
    fps: Number,
    duration: String,
    bitrate: String,
    codec: String,
    siteName: String,
    description: String,
    size: {
      original: Number,
      compressed: Number
    },
    contentType: String,
    dimensions: {
      width: Number,
      height: Number
    }
  }
}, { timestamps: true });

// Create the Memory model
let Memory;
try {
  Memory = mongoose.model('Memory');
} catch {
  Memory = mongoose.model('Memory', memorySchema);
}

exports.handler = async (event, context) => {
  console.log('Starting upload handler');
  
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
    console.log('Connecting to MongoDB...');
    if (!mongoose.connection.readyState) {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: DB_NAME
      });
    }
    console.log('Connected to MongoDB successfully');

    const body = JSON.parse(event.body);
    console.log('Received request body:', body);

    const { url, type } = body;

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    try {
      new URL(url);
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid URL format' })
      };
    }

    const memoryData = {
      type: type || 'url',
      url: url,
      metadata: {
        siteName: new URL(url).hostname,
        ...(body.metadata || {})
      }
    };

    console.log('Creating new memory:', JSON.stringify(memoryData, null, 2));
    const memory = new Memory(memoryData);
    const savedMemory = await memory.save();
    console.log('Memory saved successfully:', savedMemory._id);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Upload successful',
        memory: {
          _id: savedMemory._id,
          type: savedMemory.type,
          url: savedMemory.url,
          metadata: savedMemory.metadata,
          createdAt: savedMemory.createdAt
        }
      })
    };
  } catch (error) {
    console.error('Error processing upload:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      })
    };
  }
};
