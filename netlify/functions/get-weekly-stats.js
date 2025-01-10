const { getCollection, DB, COLLECTIONS } = require('./utils/db');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // Use mass-mems database for user content stats
    const collection = await getCollection(DB.MASS_MEMS, COLLECTIONS.MEMORIES);

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
    
    const statusCode = isConnectionError ? 503 : 500;
    const message = isConnectionError 
      ? 'Database connection error. Please try again later.'
      : 'Internal server error while fetching stats.';

    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: message,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
