const { getCollection, COLLECTIONS } = require('./utils/db');

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
    if (event.httpMethod === 'GET') {
      // Log query attempt
      console.log('Attempting to fetch memories...');

      const collection = await getCollection(COLLECTIONS.MEMORIES);
      const memories = await collection
        .find({ status: 'approved' })
        .sort({ createdAt: -1 })
        .toArray();

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
