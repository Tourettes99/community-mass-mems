const { getCollection, COLLECTIONS } = require('./utils/db');
const { ObjectId } = require('mongodb');

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

    const collection = await getCollection(COLLECTIONS.MEMORIES);

    // Find the memory first
    const memory = await collection.findOne({ _id: new ObjectId(memoryId) });
    if (!memory) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: `Memory not found with ID: ${memoryId}` })
      };
    }

    // Initialize votes and userVotes if they don't exist
    const votes = memory.votes || { up: 0, down: 0 };
    const userVotes = memory.userVotes || {};

    // Get current user's vote
    const currentVote = userVotes[userId];

    // Calculate vote changes
    let update;
    if (!currentVote) {
      // New vote
      update = {
        $inc: { [`votes.${voteType}`]: 1 },
        $set: { [`userVotes.${userId}`]: voteType }
      };
    } else if (currentVote === voteType) {
      // Undo vote
      update = {
        $inc: { [`votes.${voteType}`]: -1 },
        $unset: { [`userVotes.${userId}`]: "" }
      };
    } else {
      // Change vote (e.g., from up to down)
      update = {
        $inc: {
          [`votes.${currentVote}`]: -1,
          [`votes.${voteType}`]: 1
        },
        $set: { [`userVotes.${userId}`]: voteType }
      };
    }

    try {
      // Update the memory with atomic operations
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(memoryId) },
        update,
        { returnDocument: 'after' }
      );

      const updatedMemory = result.value;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Vote recorded successfully',
          votes: updatedMemory.votes,
          userVote: updatedMemory.userVotes[userId] || null,
          userVotes: updatedMemory.userVotes
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
