require('dotenv').config();
const { getCollection, COLLECTIONS } = require('./utils/db');
const openaiModeration = require('./services/openaiModeration');

exports.handler = async function(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    // Initialize services and get collection
    await openaiModeration.initialize();
    const collection = await getCollection(COLLECTIONS.MEMORIES);

    // Get memory data from request
    const memory = JSON.parse(event.body);
    const content = memory.content;

    // Perform moderation using OpenAI API
    const moderationResult = await openaiModeration.moderateContent(content, memory.type);

    // Update memory status in database
    await collection.updateOne(
      { _id: memory._id },
      { 
        $set: { 
          status: moderationResult.flagged ? 'rejected' : 'approved',
          moderationResult: {
            flagged: moderationResult.flagged,
            categories: moderationResult.categories,
            category_scores: moderationResult.category_scores,
            reason: moderationResult.reason
          }
        }
      }
    );

    // Auto-reject if content is flagged
    if (moderationResult.flagged) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'rejected',
          reason: moderationResult.reason,
          categories: moderationResult.categories,
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
      body: JSON.stringify({ 
        error: 'Internal server error during moderation',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
}
