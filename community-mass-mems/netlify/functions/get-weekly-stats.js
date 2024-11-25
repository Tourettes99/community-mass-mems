const { connectToDatabase } = require('./utils/db');
const Memory = require('./models/Memory');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    await connectToDatabase();

    // Get current date and start of week (Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Set to Sunday

    // Get next Sunday
    const nextReset = new Date(startOfWeek);
    nextReset.setDate(nextReset.getDate() + 7);

    // Count posts this week
    const postsThisWeek = await Memory.countDocuments({
      submittedAt: { $gte: startOfWeek.toISOString() }
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get weekly stats' })
    };
  }
};
