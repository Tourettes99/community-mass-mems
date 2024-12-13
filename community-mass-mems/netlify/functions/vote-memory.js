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
    const { memoryId, voteType, userId } = JSON.parse(event.body);

    // Validate input
    if (!memoryId || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Memory ID and User ID are required' })
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
    const memory = await Memory.findById(memoryId).exec();
    if (!memory) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: `Memory not found with ID: ${memoryId}` })
      };
    }

    // Initialize votes if they don't exist
    if (!memory.votes) {
      memory.votes = { up: 0, down: 0 };
    }

    // Initialize userVotes if it doesn't exist
    if (!memory.userVotes || !(memory.userVotes instanceof Map)) {
      memory.userVotes = new Map();
    }

    // Get current user's vote
    const currentVote = memory.userVotes.get(userId);

    // Calculate vote changes
    if (!currentVote) {
      // New vote
      memory.votes[voteType] += 1;
      memory.userVotes.set(userId, voteType);
    } else if (currentVote === voteType) {
      // Undo vote
      memory.votes[voteType] -= 1;
      memory.userVotes.delete(userId);
    } else {
      // Change vote (e.g., from up to down)
      memory.votes[currentVote] -= 1;
      memory.votes[voteType] += 1;
      memory.userVotes.set(userId, voteType);
    }

    try {
      // Save the updated memory
      await memory.save();

      // Convert userVotes to object for JSON response
      const userVotesObj = {};
      memory.userVotes.forEach((value, key) => {
        userVotesObj[key] = value;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Vote recorded successfully',
          votes: memory.votes,
          userVote: memory.userVotes.get(userId) || null,
          userVotes: userVotesObj
        })
      };
    } catch (updateError) {
      console.error('Error updating vote:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          message: 'Failed to update vote',
          error: process.env.NODE_ENV === 'development' ? updateError.message : undefined
        })
      };
    }
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
