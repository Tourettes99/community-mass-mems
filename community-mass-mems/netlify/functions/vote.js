require('dotenv').config();
const mongoose = require('mongoose');
const Memory = require('./models/Memory');

let conn = null;

const connectDb = async () => {
  if (conn == null) {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
  }
  return conn;
};

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Allow': 'POST' },
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    const { memoryId, voteType } = JSON.parse(event.body);

    // Validate input
    if (!memoryId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Memory ID is required' })
      };
    }

    if (!['up', 'down'].includes(voteType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Vote type must be either "up" or "down"' })
      };
    }

    await connectDb();

    // Find the memory first
    const memory = await Memory.findById(memoryId);
    if (!memory) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Memory not found' })
      };
    }

    // Update the appropriate vote count
    const updateField = `votes.${voteType}`;
    const updatedMemory = await Memory.findByIdAndUpdate(
      memoryId,
      { $inc: { [updateField]: 1 } },
      { 
        new: true,
        runValidators: true
      }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Vote recorded successfully',
        votes: updatedMemory.votes
      })
    };

  } catch (error) {
    console.error('Error in vote function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error while recording vote',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
