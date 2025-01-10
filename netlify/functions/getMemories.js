const { getCollection, COLLECTIONS } = require('./utils/db');

exports.handler = async (event, context) => {
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
    // Get memories collection
    const collection = await getCollection(COLLECTIONS.MEMORIES);

    // Fetch memories with proper error handling
    const memories = await collection
      .find({ status: 'approved' })
      .sort({ submittedAt: -1 })
      .toArray();

    // Format memories
    const formattedMemories = memories.map(memory => ({
      ...memory,
      submittedAt: memory.submittedAt ? new Date(memory.submittedAt).toISOString() : null,
      metadata: {
        ...memory.metadata,
        createdAt: memory.submittedAt ? new Date(memory.submittedAt).toISOString() : null,
        updatedAt: memory.updatedAt ? new Date(memory.updatedAt).toISOString() : null
      },
      votes: {
        up: memory.votes?.up || 0,
        down: memory.votes?.down || 0
      }
    })).filter(Boolean);

    console.log(`Successfully fetched ${formattedMemories.length} approved memories`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formattedMemories)
    };
  } catch (error) {
    console.error('Error in getMemories function:', error);
    
    // Determine if it's a connection error
    const isConnectionError = error.message.includes('connect') || 
                            error.message.includes('timeout') ||
                            error.message.includes('network');
    
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
