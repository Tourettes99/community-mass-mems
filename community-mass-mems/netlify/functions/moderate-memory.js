require('dotenv').config();
const mongoose = require('mongoose');
const Memory = require('./models/Memory');
const groqModeration = require('./services/groqModeration');

let conn = null;

const connectDb = async () => {
  if (conn == null) {
    conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
  }
  return conn;
};

exports.handler = async function(event, context) {
  try {
    // Initialize services
    await groqModeration.initialize();

    // Get memory data from request
    const memory = JSON.parse(event.body);
    const content = memory.content;

    // Perform moderation using Groq API
    const moderationResult = await groqModeration.moderateContent(content, memory.type);

    // Auto-reject if content is flagged
    if (moderationResult.flagged) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'rejected',
          reason: moderationResult.reason || 'Content violates community guidelines',
          scores: moderationResult.category_scores
        })
      };
    }

    // Content passed moderation
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'approved',
        scores: moderationResult.category_scores
      })
    };
  } catch (error) {
    console.error('Error in moderation:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error during moderation' })
    };
  }
}
