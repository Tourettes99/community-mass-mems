require('dotenv').config();
const { MongoClient } = require('mongodb');
const groqModeration = require('./services/groqModeration');
const emailNotification = require('./services/emailNotification');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let client;

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
    return {
      statusCode: 405,
      headers: {
        'Allow': 'POST',
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Invalid request body' })
      };
    }

    const { content, tags, type = 'text' } = body;

    // Strict content validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Content is required and must be a non-empty string' })
      };
    }

    // Initialize and run auto moderation
    await groqModeration.initialize();
    const moderationResult = await groqModeration.moderateContent(content, type);

    // Connect to MongoDB
    client = await MongoClient.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      family: 4
    });

    const db = client.db('memories');
    const collection = db.collection('memories');

    // Create memory document with moderation status
    const memory = {
      type: type,
      content: content.trim(),
      tags: Array.isArray(tags) ? tags.filter(t => t && typeof t === 'string') : [],
      status: moderationResult.decision,  // Use decision directly: 'approve' or 'reject'
      moderationResult: {
        decision: moderationResult.decision,
        reason: moderationResult.reason,
        categories: moderationResult.categories,
        flagged: moderationResult.flagged,
        category_scores: moderationResult.category_scores
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
      updatedAt: new Date()
    };

    // Save to database regardless of moderation result (for audit purposes)
    const result = await collection.insertOne(memory);
    memory._id = result.insertedId;

    // Send email notification with the complete memory object
    await emailNotification.sendModerationNotification(memory, moderationResult);

    // Return appropriate response based on moderation decision
    if (moderationResult.decision === 'reject') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          message: 'Content rejected by moderation',
          reason: moderationResult.reason,
          categories: moderationResult.categories,
          category_scores: moderationResult.category_scores,
          id: result.insertedId
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
        id: result.insertedId
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        message: 'Error submitting memory',
        error: error.message 
      })
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
};
