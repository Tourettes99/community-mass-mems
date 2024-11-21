const mongoose = require('mongoose');
const { Buffer } = require('buffer');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

// Initialize MongoDB connection
let cachedDb = null;
async function connectToDatabase() {
  console.log('Attempting to connect to MongoDB...');
  
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log('Using cached database connection');
    return cachedDb;
  }

  try {
    console.log('Connecting to MongoDB...');
    const connection = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      bufferCommands: false,
      dbName: 'memories'
    });

    console.log('MongoDB connected successfully');
    cachedDb = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

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
}, { 
  timestamps: true,
  strict: false 
});

// Initialize Memory model
let Memory = mongoose.models.Memory || mongoose.model('Memory', memorySchema);

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  console.log('Function invoked with event:', {
    method: event.httpMethod,
    headers: event.headers,
    path: event.path
  });

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
    // Connect to MongoDB first
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connection established');

    // Parse request body
    let body;
    try {
      console.log('Raw request body:', event.body);
      console.log('Content-Type:', event.headers['content-type']);
      
      body = JSON.parse(event.body);
      console.log('Parsed body:', body);
    } catch (error) {
      console.error('Error parsing request body:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid request body',
          details: error.message 
        })
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
      url: body.url || '',
      content: body.content || '',
      tags: body.tags || [],
      metadata: {
        title: body.type === 'text' ? body.content?.slice(0, 50) : body.url,
        mediaType: body.type,
        description: body.content || body.url
      }
    };

    console.log('Creating memory with data:', memoryData);
    
    // Create and save memory
    const memory = new Memory(memoryData);
    console.log('Validating memory...');
    await memory.validate();
    console.log('Memory validated successfully');
    
    console.log('Saving memory...');
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
    console.error('Error processing request:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        type: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
