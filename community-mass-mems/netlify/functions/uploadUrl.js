require('dotenv').config();
const { MongoClient } = require('mongodb');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const emailNotification = require('./services/emailNotification');
const { getUrlMetadata } = require('./utils/urlMetadata');
const autoModeration = require('./services/autoModeration');

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Media file extensions
const MEDIA_EXTENSIONS = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif'],
  videos: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'm4v', 'mkv', '3gp'],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma', 'aiff'],
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'md', 'json']
};

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let client;

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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request body' })
      };
    }

    const { type, url, content, tags } = body;
    
    // Check if we have either URL or content
    if (type === 'url' && !url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required for URL type' })
      };
    }
    if (type === 'text' && !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content is required for text type' })
      };
    }

    // Get metadata based on type
    let metadata;
    if (type === 'url') {
      metadata = await getUrlMetadata(url.trim());
      
      // Check if the URL is accessible
      if (metadata.error) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            error: 'URL validation failed',
            details: metadata.error,
            isExpired: metadata.isExpired
          })
        };
      }
    } else {
      metadata = {
        type: 'text',
        format: 'text/plain',
        title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        description: content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // Initialize and run auto moderation
    await autoModeration.initialize();
    const moderationResult = await autoModeration.moderateContent(type === 'url' ? url : content, type);

    // Connect to MongoDB
    client = await MongoClient.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      family: 4
    });

    const db = client.db('memories');
    const collection = db.collection('memories');

    // Create memory document
    const memory = {
      type: type,
      url: type === 'url' ? url : undefined,
      content: type === 'text' ? content : undefined,
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
        ...metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      votes: { up: 0, down: 0 },
      userVotes: {},
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to database
    const result = await collection.insertOne(memory);
    memory._id = result.insertedId;
    
    // Send notification email
    await emailNotification.sendModerationNotification(memory, moderationResult);

    // Return appropriate response based on moderation decision
    if (moderationResult.decision === 'reject') {
      return {
        statusCode: 400,
        headers,
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
      headers,
      body: JSON.stringify({
        message: 'Content submitted and approved',
        id: result.insertedId
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error submitting content',
        error: error.message 
      })
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
};
