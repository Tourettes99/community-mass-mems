require('dotenv').config();
const { getCollection, COLLECTIONS } = require('./utils/db');
const openaiModeration = require('./services/openaiModeration');
const emailNotification = require('./services/emailNotification');
const { createErrorResponse, logError } = require('./utils/errors');
const { createModerationError, logModerationDecision } = require('./utils/moderationErrors');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return createErrorResponse('INVALID_REQUEST_BODY', 'Only POST method is allowed', 405);
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      logError('INVALID_REQUEST_BODY', error, { body: event.body });
      return createErrorResponse('INVALID_REQUEST_BODY', 'Failed to parse JSON body');
    }

    const { content, tags, type = 'text' } = body;

    // Strict content validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return createErrorResponse('MISSING_CONTENT', 'Content must be a non-empty string');
    }

    try {
      // Initialize and run auto moderation
      const moderationResult = await openaiModeration.moderateContent(content, type);

      // Log moderation decision for analysis
      const requestId = Math.random().toString(36).substring(2, 15);
      logModerationDecision(content, moderationResult, {
        type,
        requestId,
        userId: event.headers['x-user-id'] // If you have user tracking
      });

      // Get memories collection
      const collection = await getCollection(COLLECTIONS.MEMORIES);

      // Create memory document with moderation status
      const memory = {
        type: type,
        content: content.trim(),
        tags: Array.isArray(tags) ? tags.filter(t => t && typeof t === 'string') : [],
        status: moderationResult.flagged ? 'rejected' : 'approved',
        moderationResult: {
          flagged: moderationResult.flagged,
          categories: moderationResult.categories,
          category_scores: moderationResult.category_scores,
          reason: moderationResult.reason
        },
        metadata: {
          type: type,
          format: 'text/plain',
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          description: content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        votes: { up: 0, down: 0 },
        userVotes: {},
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        requestId // Store requestId for tracking
      };

      try {
        // Save to database regardless of moderation result (for audit purposes)
        const result = await collection.insertOne(memory);
        memory._id = result.insertedId;
      } catch (error) {
        logError('DB_WRITE_ERROR', error, { content: content.slice(0, 100) });
        return createErrorResponse('DB_WRITE_ERROR', error.message, 500);
      }

      try {
        // Send email notification with the complete memory object
        await emailNotification.sendModerationNotification(memory, moderationResult);
      } catch (error) {
        // Log but don't fail if notification fails
        logError('NOTIFICATION_ERROR', error, { memoryId: memory._id });
      }

      // Return appropriate response based on moderation decision
      if (moderationResult.flagged) {
        // Create user-friendly moderation error response
        const moderationError = createModerationError(
          moderationResult.categories,
          moderationResult.category_scores
        );

        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: moderationError,
            id: memory._id,
            requestId
          })
        };
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Memory submitted and approved',
          id: memory._id,
          status: 'approved',
          requestId
        })
      };

    } catch (error) {
      if (error.message.includes('connect') || error.message.includes('timeout')) {
        logError('DB_CONNECTION_ERROR', error);
        return createErrorResponse('DB_CONNECTION_ERROR', error.message, 503);
      }
      throw error; // Re-throw for general error handling
    }
  } catch (error) {
    logError('INTERNAL_ERROR', error);
    return createErrorResponse('INTERNAL_ERROR', error.message, 500);
  }
};
