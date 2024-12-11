require('dotenv').config();
const mongoose = require('mongodb').MongoClient;
const autoModeration = require('./services/autoModeration');
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
    const { content, tags } = JSON.parse(event.body);
    if (!content) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Content is required' })
      };
    }

    // Initialize and run auto moderation
    await autoModeration.initialize();
    const moderationResult = await autoModeration.moderateContent(content);

    // Connect to MongoDB
    client = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      family: 4
    });

    const db = client.db('memories');
    const collection = db.collection('memories');

    // Create memory document with moderation status
    const memory = {
      type: 'text',
      content: content,
      tags: Array.isArray(tags) ? tags : [],
      status: moderationResult.decision === 'approve' ? 'approved' : 'rejected',
      moderationResult: {
        decision: moderationResult.decision,
        reason: moderationResult.reason,
        categories: moderationResult.categories,
        flagged: moderationResult.flagged,
        category_scores: moderationResult.category_scores
      },
      metadata: {
        type: 'text',
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

    // Send email notification with the detailed report
    await emailNotification.sendModerationNotification(content, moderationResult);

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
