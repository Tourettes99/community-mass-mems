require('dotenv').config();
const mongoose = require('mongoose');
const Memory = require('./models/Memory');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const emailNotification = require('./services/emailNotification');
const { getUrlMetadata } = require('./utils/urlMetadata');
const groqModeration = require('./services/groqModeration');
const fileStorage = require('./services/fileStorage');

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

// Initialize services
let servicesInitialized = false;
async function initializeServices() {
  if (!servicesInitialized) {
    await groqModeration.initialize();
    await fileStorage.initialize();
    servicesInitialized = true;
  }
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let client;

  try {
    // Debug logging
    console.log('Request method:', event.httpMethod);
    console.log('Request headers:', event.headers);
    console.log('Request body:', event.body);

    // Initialize services first
    try {
      await initializeServices();
    } catch (error) {
      console.error('Error initializing services:', error);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Failed to initialize services',
          details: error.message 
        })
      };
    }

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

    const { type, tags } = body;
    let { url, content } = body;
    
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

    // Process Discord CDN URLs
    if (url && url.includes('cdn.discordapp.com')) {
      try {
        console.log('Processing Discord CDN URL:', url);
        const storedFile = await fileStorage.storeFileFromUrl(url);
        console.log('File stored successfully:', storedFile);
        
        // Replace the Discord URL with our permanent URL
        const permanentUrl = await fileStorage.getFileUrl(storedFile.fileId);
        console.log('Generated permanent URL:', permanentUrl);
        url = permanentUrl;
      } catch (error) {
        console.error('Error processing Discord CDN URL:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to process Discord CDN URL',
            details: error.message 
          })
        };
      }
    }

    // Run content moderation
    try {
      console.log('Starting content moderation...');
      await groqModeration.initialize();
      console.log('Initialized groqModeration service');
      
      const contentToModerate = type === 'url' ? url : content;
      console.log('Content to moderate:', contentToModerate);
      console.log('Type:', type);
      
      const moderationResult = await groqModeration.moderateContent(contentToModerate, type);
      console.log('Moderation result:', JSON.stringify(moderationResult, null, 2));

      // Connect to MongoDB using Mongoose
      console.log('Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        family: 4
      });
      console.log('Connected to MongoDB');

      // Map moderation result to memory status
      const status = moderationResult.flagged ? 'rejected' : 'approved';
      console.log('Mapped status:', status);

      // Create memory document using Mongoose model
      const memory = new Memory({
        type: type,
        url: type === 'url' ? url : undefined,
        content: type === 'text' ? content : undefined,
        tags: Array.isArray(tags) ? tags.filter(t => t && typeof t === 'string') : [],
        status: status,
        moderationResult: {
          decision: status,
          reason: moderationResult.reason,
          categories: moderationResult.category_scores,
          flagged: moderationResult.flagged,
          category_scores: moderationResult.category_scores
        },
        metadata: {
          ...metadata,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        votes: { up: 0, down: 0 },
        userVotes: {},
        submittedAt: new Date()
      });

      // Save to database
      await memory.save();
      
      // Send notification email
      await emailNotification.sendModerationNotification(memory, moderationResult);

      // Return appropriate response based on moderation decision
      if (moderationResult.flagged) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            message: 'Content rejected by moderation',
            reason: moderationResult.reason,
            categories: moderationResult.category_scores,
            category_scores: moderationResult.category_scores,
            id: memory._id
          })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Content submitted successfully',
          id: memory._id,
          memory: memory
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
      // Clean up MongoDB connections
      try {
        await fileStorage.cleanup();
      } catch (error) {
        console.error('Error cleaning up file storage:', error);
      }
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('Error in main handler:', error);
    console.error('Error stack:', error.stack);
    
    // Close MongoDB connection if it exists
    await mongoose.disconnect();

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
