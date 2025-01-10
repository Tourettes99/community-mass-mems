const { getCollection, COLLECTIONS } = require('./utils/db');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Verify admin token
  const authHeader = event.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  try {
    const { message } = JSON.parse(event.body);
    
    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    const collection = await getCollection(COLLECTIONS.ANNOUNCEMENTS);

    const announcement = {
      message,
      timestamp: new Date().toISOString(),
      createdAt: new Date()
    };

    await collection.insertOne(announcement);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(announcement),
    };
  } catch (error) {
    console.error('Error adding announcement:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
