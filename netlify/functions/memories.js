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

let Memory;
try {
  Memory = mongoose.model('Memory');
} catch {
  Memory = mongoose.model('Memory', memorySchema);
}

// Cache mongoose connection
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    console.log('Using existing database connection');
    return;
  }

  try {
    console.log('MongoDB URI:', MONGODB_URI.replace(/:[^:]*@/, ':****@')); // Log URI with hidden password
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('New database connection established');
  } catch (error) {
    console.error('Error connecting to database:', error.message);
    throw error;
  }
};

exports.handler = async (event, context) => {
  // Set this to false to prevent function timeout
  context.callbackWaitsForEmptyEventLoop = false;

  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  try {
    await connectToDatabase();
    console.log('Successfully connected to database');

    if (event.httpMethod === 'GET') {
      const memories = await Memory.find({}).sort({ createdAt: -1 });
      console.log(`Retrieved ${memories.length} memories`);

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
    console.error('Error in memories function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
