const { MongoClient } = require('mongodb');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let client;
  try {
    // Parse request body
    const { memoryId, vote } = JSON.parse(event.body);

    // Validate input
    if (!memoryId || ![1, -1].includes(vote)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input' })
      };
    }

    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE);
    const memories = db.collection('memories');

    // Update vote count
    const result = await memories.findOneAndUpdate(
      { _id: memoryId },
      { $inc: { votes: vote } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Memory not found' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Vote recorded successfully',
        memory: result.value
      })
    };

  } catch (error) {
    console.error('Error in vote-memory function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
};
