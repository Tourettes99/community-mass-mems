const { MongoClient } = require('mongodb');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Verify admin token
  const authHeader = event.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  try {
    const { message } = JSON.parse(event.body);
    
    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const db = client.db('mass-mems');
    const collection = db.collection('announcements');

    const announcement = {
      message,
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
    };

    await collection.insertOne(announcement);
    await client.close();

    return {
      statusCode: 200,
      body: JSON.stringify(announcement),
    };
  } catch (error) {
    console.error('Error adding announcement:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
