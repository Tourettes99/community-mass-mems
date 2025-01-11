require('dotenv').config();
const { getCollection, COLLECTIONS } = require('./utils/db');
const { ObjectId } = require('mongodb');
const openaiModeration = require('./services/openaiModeration');
const { createErrorResponse, logError } = require('./utils/errors');
const { createModerationError, logModerationDecision } = require('./utils/moderationErrors');
const { sendModerationNotification } = require('./utils/emailConfig');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Debug logging
    console.log('Request method:', event.httpMethod);
    console.log('Request headers:', event.headers);
    console.log('Request body:', event.body);

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: ''
      };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return createErrorResponse('INVALID_REQUEST_BODY', 'Only POST method is allowed', 405);
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      logError('INVALID_REQUEST_BODY', error, { body: event.body });
      return createErrorResponse('INVALID_REQUEST_BODY', 'Failed to parse JSON body');
    }

    const { type, content, tags } = body;

    // Check if we have content
    if (!content) {
      return createErrorResponse('MISSING_CONTENT', 'Content is required');
    }

    try {
      const collection = await getCollection(COLLECTIONS.MEMORIES);
      const requestId = Math.random().toString(36).substring(2, 15);

      // Create new memory document
      const memory = {
        _id: new ObjectId(),
        type,
        content: content.trim(),
        tags: Array.isArray(tags) ? tags.filter(t => t && typeof t === 'string') : [],
        status: 'pending', // Default to pending until moderation
        metadata: {
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          description: content,
          mediaType: 'text',
          format: 'text/plain'
        },
        submittedAt: new Date().toISOString(),
        votes: { up: 0, down: 0 },
        userVotes: new Map(),
        requestId
      };

      // Perform content moderation
      try {
        const moderationResult = await openaiModeration.moderateContent(content, type);

        // Log moderation decision
        logModerationDecision(
          content,
          moderationResult,
          {
            type,
            requestId,
            userId: event.headers['x-user-id'],
            metadata: {
              title: memory.metadata.title
            }
          }
        );

        // Update memory with moderation result
        memory.status = moderationResult.flagged ? 'rejected' : 'approved';
        memory.moderationResult = {
          flagged: moderationResult.flagged,
          categories: moderationResult.categories,
          category_scores: moderationResult.category_scores,
          reason: moderationResult.reason
        };

        // Send email notification
        try {
          await sendModerationNotification(
            content,
            moderationResult,
            {
              type,
              requestId,
              userId: event.headers['x-user-id'],
              title: memory.metadata.title
            }
          );
        } catch (error) {
          console.error('Error sending moderation notification email:', error);
          // Continue even if email fails
        }

        if (moderationResult.flagged) {
          // Create user-friendly moderation error response
          const moderationError = createModerationError(
            moderationResult.categories,
            moderationResult.category_scores
          );

          // Save to database for audit
          await collection.insertOne(memory);

          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: moderationError,
              id: memory._id,
              requestId
            })
          };
        }
      } catch (error) {
        logError('MODERATION_FAILED', error, { type, content });
        // Set status to pending if moderation fails
        memory.status = 'pending';
        memory.moderationResult = {
          error: 'Moderation service unavailable',
          timestamp: new Date().toISOString()
        };
      }

      // Save to database
      try {
        await collection.insertOne(memory);
      } catch (error) {
        logError('DB_WRITE_ERROR', error, { memoryId: memory._id });
        return createErrorResponse('DB_WRITE_ERROR', error.message, 500);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Memory submitted and approved',
          id: memory._id,
          metadata: memory.metadata,
          status: memory.status,
          requestId
        })
      };
    } catch (error) {
      logError('DB_CONNECTION_ERROR', error);
      return createErrorResponse('DB_CONNECTION_ERROR', error.message, 503);
    }
  } catch (error) {
    logError('INTERNAL_ERROR', error);
    return createErrorResponse('INTERNAL_ERROR', error.message, 500);
  }
};
