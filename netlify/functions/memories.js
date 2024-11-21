const mongoose = require('mongoose');

// MongoDB Connection URI
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is missing');
  throw new Error('MONGODB_URI environment variable is required');
}

// Memory Schema
const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'gif', 'audio', 'url'],
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
    siteName: String,
    description: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure we don't try to recreate the model if it exists
let Memory;
try {
  Memory = mongoose.models.Memory || mongoose.model('Memory', memorySchema);
} catch (e) {
  Memory = mongoose.model('Memory', memorySchema);
}

// Track connection status
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('Using existing database connection');
    return;
  }

  try {
    // Log connection attempt
    console.log('Attempting to connect to MongoDB...');
    console.log('Connection string format:', MONGODB_URI.split('@')[1]); // Log URI without credentials

    const conn = await mongoose.connect(MONGODB_URI);
    
    isConnected = true;
    console.log('MongoDB Connected:', conn.connection.host);
    
    // Add connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });

  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    isConnected = false;
    throw error;
  }
};

exports.handler = async (event, context) => {
  // Prevent function timeout from waiting for database
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  try {
    // Connect to database
    await connectToDatabase();

    if (event.httpMethod === 'GET') {
      // Log query attempt
      console.log('Attempting to fetch memories...');

      const memories = await Memory.find({})
        .sort({ createdAt: -1 })
        .lean() // Convert to plain JavaScript objects
        .exec();

      console.log(`Successfully retrieved ${memories.length} memories`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(memories)
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Function error:', error);
    console.error('Stack trace:', error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message,
        type: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
