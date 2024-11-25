require('dotenv').config();
const mongoose = require('mongoose');
const Memory = require('./models/Memory');

let conn = null;

const connectDb = async () => {
  if (conn == null) {
    try {
      conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000
      });
      console.log('Successfully connected to MongoDB');
      return conn;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }
  return conn;
};

exports.handler = async (event, context) => {
  // Prevent function from waiting for connections to close
  context.callbackWaitsForEmptyEventLoop = false;
  
  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Validate HTTP method
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Allow': 'GET' },
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }
  
  try {
    // Connect to database
    await connectDb();
    console.log('Connected to database, fetching memories...');

    // Fetch memories with proper error handling
    let memories;
    try {
      memories = await Memory.find()
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      // Format memories to ensure proper date handling
      memories = memories.map(memory => ({
        ...memory,
        createdAt: memory.createdAt ? new Date(memory.createdAt).toISOString() : null,
        updatedAt: memory.updatedAt ? new Date(memory.updatedAt).toISOString() : null
      }));
      
      console.log(`Successfully fetched ${memories.length} memories`);
    } catch (dbError) {
      console.error('Database query error:', dbError);
      throw new Error(`Database query failed: ${dbError.message}`);
    }

    // Validate memories array
    if (!Array.isArray(memories)) {
      console.error('Invalid memories format:', memories);
      throw new Error('Invalid data format returned from database');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(memories)
    };
  } catch (error) {
    console.error('Error in getMemories function:', error);
    
    // Determine if it's a connection error
    const isConnectionError = error.name === 'MongooseError' || 
                            error.name === 'MongoError' ||
                            error.message.includes('connect');
    
    const statusCode = isConnectionError ? 503 : 500;
    const message = isConnectionError 
      ? 'Database connection error. Please try again later.'
      : 'Internal server error while fetching memories.';

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        message,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
