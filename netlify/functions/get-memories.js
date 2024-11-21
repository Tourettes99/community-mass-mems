const { connectToDatabase } = require('./mongodb');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

exports.handler = async (event, context) => {
  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const collection = await connectToDatabase();
    console.log('Connected to memories.memories collection');

    // Parse query parameters
    const { tags, type, limit = 20, skip = 0 } = event.queryStringParameters || {};

    // Build query
    const query = {};
    if (tags) {
      query.tags = { $in: tags.split(',') };
    }
    if (type) {
      query.type = type;
    }

    // Get total count for pagination
    const total = await collection.countDocuments(query);

    // Fetch memories with pagination
    const items = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      })
    };
  } catch (error) {
    console.error('Error fetching memories:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
