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

// Initialize MongoDB connection
let conn = null;
const connectDb = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    if (conn == null) {
      conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('Successfully connected to MongoDB');
    }
    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
};

// Initialize services
let servicesInitialized = false;
async function initializeServices() {
  if (!servicesInitialized) {
    try {
      console.log('Initializing services...');
      await connectDb();
      await fileStorage.initialize();
      servicesInitialized = true;
      console.log('Services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      throw error;
    }
  }
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // Debug logging
    console.log('Request method:', event.httpMethod);
    console.log('Request headers:', event.headers);
    console.log('Request body:', event.body);

    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          ...headers,
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

    // Initialize services
    try {
      await initializeServices();
    } catch (error) {
      console.error('Service initialization failed:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to initialize services',
          details: error.message
        })
      };
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid request body',
          details: error.message
        })
      };
    }

    const { type, tags } = body;
    let { url, content } = body;

    // Validate required fields
    if (!type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Type is required' })
      };
    }

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

    // Process the upload based on type
    let result;
    if (type === 'url') {
      try {
        // Validate URL format
        const urlObj = new URL(url.trim());
        if (!urlObj.protocol.startsWith('http')) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid URL protocol. Only HTTP(S) URLs are allowed.' })
          };
        }

        // Get metadata
        const urlMetadata = await getUrlMetadata(url.trim());
        console.log('URL Metadata:', urlMetadata);

        // Structure metadata according to schema
        const metadata = {
          basicInfo: {
            title: urlMetadata.basicInfo.title,
            description: urlMetadata.basicInfo.description,
            mediaType: urlMetadata.basicInfo.mediaType,
            thumbnailUrl: urlMetadata.basicInfo.thumbnailUrl,
            platform: urlMetadata.basicInfo.platform,
            contentUrl: urlMetadata.basicInfo.contentUrl,
            fileType: urlMetadata.basicInfo.fileType,
            domain: urlMetadata.basicInfo.domain,
            isSecure: urlMetadata.basicInfo.isSecure
          },
          embed: {
            embedUrl: urlMetadata.embed?.embedUrl,
            embedHtml: urlMetadata.embed?.embedHtml,
            embedType: urlMetadata.embed?.embedType
          },
          timestamps: {
            createdAt: new Date(),
            updatedAt: new Date()
          },
          tags: tags || []
        };
        
        // Create memory document
        const memory = new Memory({
          type: 'url',
          url: url.trim(),
          metadata: metadata,
          status: 'approved',
          votes: { up: 0, down: 0 }
        });

        console.log('Saving memory:', memory);
        await memory.save();
        result = memory;

      } catch (error) {
        console.error('URL processing error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Failed to process URL',
            details: error.message
          })
        };
      }
    } else if (type === 'text') {
      try {
        // Create memory document for text content
        const memory = new Memory({
          type: 'text',
          content: content.trim(),
          metadata: {
            basicInfo: {
              title: 'Text Post',
              description: content.trim().substring(0, 200) + (content.length > 200 ? '...' : ''),
              mediaType: 'text',
              platform: 'community'
            },
            timestamps: {
              createdAt: new Date(),
              updatedAt: new Date()
            },
            tags: tags || []
          },
          status: 'approved',
          votes: { up: 0, down: 0 }
        });

        await memory.save();
        result = memory;

      } catch (error) {
        console.error('Text processing error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Failed to process text content',
            details: error.message
          })
        };
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
