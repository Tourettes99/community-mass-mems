const { MongoClient } = require('mongodb');

exports.handler = async (event, context) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let client;
  try {
    console.log('INFO: Connecting to MongoDB...');
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('INFO: Connected to MongoDB');

    const db = client.db('mass-mems');
    const collection = db.collection('announcements');

    console.log('INFO: Fetching announcements...');
    const announcements = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    console.log('INFO: Found announcements:', JSON.stringify(announcements));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(announcements),
    };
  } catch (error) {
    console.error('ERROR:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch announcements' }),
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
};
