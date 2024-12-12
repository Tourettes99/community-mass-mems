const { MongoClient } = require('mongodb');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const db = client.db('mass-mems');
    const collection = db.collection('announcements');

    const announcements = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    await client.close();

    return {
      statusCode: 200,
      body: JSON.stringify(announcements),
    };
  } catch (error) {
    console.error('Error getting announcements:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
