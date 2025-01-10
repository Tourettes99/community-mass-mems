const { getCollection, DB_NAME } = require('./utils/db');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const collection = await getCollection(DB_NAME, 'memories');

    // Get current date and start of week (Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Set to Sunday

    // Get next Sunday
    const nextReset = new Date(startOfWeek);
    nextReset.setDate(nextReset.getDate() + 7);

    // Count posts this week
    const postsThisWeek = await collection.countDocuments({
      submittedAt: { $gte: startOfWeek },
      status: 'approved'  // Only count approved posts
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        postsThisWeek,
        weeklyLimit: 35,
        nextReset: nextReset.toISOString()
      })
    };
  } catch (error) {
    console.error('Error getting weekly stats:', error);
    
    // Determine if it's a connection error
    const isConnectionError = error.message.includes('connect') || 
                            error.message.includes('timeout') ||
                            error.message.includes('network');
    
    return {
      statusCode: isConnectionError ? 503 : 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get weekly stats',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
