const mongoose = require('mongoose');
const { Buffer } = require('buffer');
const { extractUrlMetadata, extractFileMetadata } = require('./utils/metadata');
const { MongoClient } = require('mongodb');
const { unfurl } = require('unfurl.js');
const { fileTypeFromBuffer } = require('file-type');
const getMetadata = require('page-metadata-parser').getMetadata;
const domino = require('domino');
const fetch = require('node-fetch');
const sizeOf = require('image-size');
const logger = require('./utils/logger');

const MONGODB_URI = 'mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'memories';
const COLLECTION_NAME = 'memories';

let cachedDb = null;
let cachedClient = null;

async function connectToDatabase() {
  if (cachedDb && cachedClient) {
    logger.debug('Using cached database connection');
    return { db: cachedDb, client: cachedClient };
  }

  try {
    logger.info('Connecting to MongoDB...', { uri: MONGODB_URI.replace(/\/\/.*@/, '//***:***@') });
    const client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increased timeout
      maxPoolSize: 10,
      socketTimeoutMS: 45000, // Added socket timeout
      connectTimeoutMS: 30000 // Added connect timeout
    });

    const db = client.db(DB_NAME);
    cachedDb = db;
    cachedClient = client;
    logger.info('MongoDB connected successfully', { 
      database: DB_NAME,
      collection: COLLECTION_NAME 
    });
    return { db, client };
  } catch (error) {
    logger.error('MongoDB connection error', error, {
      database: DB_NAME,
      collection: COLLECTION_NAME
    });
    throw error;
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Memory Schema
const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['url', 'image', 'video', 'audio', 'text', 'static', 'social'],
    required: true
  },
  url: String,
  content: String,
  tags: [String],
  metadata: {
    title: String,
    description: String,
    siteName: String,
    mediaType: String,
    image: String,
    playbackHtml: String,
    fileName: String,
    format: String,
    dimensions: {
      width: Number,
      height: Number
    },
    size: {
      original: Number,
      compressed: Number
    },
    contentType: String,
    oEmbed: Object,
    openGraph: Object,
    twitterCard: Object
  }
}, {
  timestamps: true,
  strict: false 
});

// Initialize Memory model
let Memory = mongoose.models.Memory || mongoose.model('Memory', memorySchema);

async function extractUrlMetadata(url) {
  try {
    // Fetch URL content
    const response = await fetch(url);
    const html = await response.text();
    
    // Create virtual DOM
    const doc = domino.createWindow(html).document;
    
    // Get basic metadata
    const metadata = getMetadata(doc, url);
    
    // Get unfurl metadata (includes oEmbed data)
    const unfurlData = await unfurl(url);
    
    return {
      ...metadata,
      oEmbed: unfurlData.oEmbed || null,
      openGraph: unfurlData.open_graph || null,
      twitterCard: unfurlData.twitter_card || null
    };
  } catch (error) {
    logger.error('Error extracting URL metadata:', error);
    return null;
  }
}

async function extractFileMetadata(base64Data, contentType) {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Get file type information
    const fileType = await fileTypeFromBuffer(buffer);
    
    let metadata = {
      type: fileType ? fileType.mime : contentType,
      ext: fileType ? fileType.ext : contentType.split('/')[1]
    };
    
    // Extract image dimensions if it's an image
    if (metadata.type.startsWith('image/')) {
      try {
        const dimensions = sizeOf(buffer);
        metadata.dimensions = {
          width: dimensions.width,
          height: dimensions.height
        };
      } catch (err) {
        logger.error('Error getting image dimensions:', err);
      }
    }
    
    return metadata;
  } catch (error) {
    logger.error('Error extracting file metadata:', error);
    return null;
  }
}

exports.handler = async (event, context) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  context.callbackWaitsForEmptyEventLoop = false;

  try {
    logger.info('Request received', {
      method: event.httpMethod,
      path: event.path,
      headers: event.headers
    });

    if (event.httpMethod !== 'POST') {
      logger.warn('Invalid HTTP method', { method: event.httpMethod });
      return {
        statusCode: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    let data;
    try {
      data = JSON.parse(event.body);
      logger.debug('Parsed request body', {
        type: data.type,
        hasUrl: !!data.url,
        hasContent: !!data.content,
        hasFile: !!data.file,
        fileName: data.fileName
      });
    } catch (error) {
      logger.error('Error parsing request body', error);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid request body' })
      };
    }

    const { type, url, content, tags, file, fileName, contentType } = data;

    if (!type || (!url && !content && !file)) {
      logger.warn('Missing required fields', { type, hasUrl: !!url, hasContent: !!content, hasFile: !!file });
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Connect to database
    logger.info('Connecting to database...');
    const { db } = await connectToDatabase();
    const memories = db.collection(COLLECTION_NAME);
    logger.debug(`Using collection: ${COLLECTION_NAME}`);

    // Prepare memory document
    const memory = {
      type,
      tags: tags || [],
      createdAt: new Date().toISOString(),
      metadata: {
        title: '',
        description: '',
        mediaType: type,
        contentType: contentType || 'text/plain'
      }
    };

    // Only add content field if it has a value
    if (content) {
      memory.content = content;
    }

    logger.info('Processing content type:', { type });

    // Handle different types of content
    try {
      if (type === 'url' && url) {
        logger.info('Processing URL', { url });
        memory.url = url;
        
        // Enhanced URL metadata extraction
        let urlMetadata;
        try {
          urlMetadata = await extractUrlMetadata(url);
          logger.debug('Extracted URL metadata', { metadata: urlMetadata });
        } catch (metadataError) {
          logger.error('Metadata extraction error', metadataError, { url });
          urlMetadata = {
            title: url,
            description: 'Failed to extract metadata',
            mediaType: 'url'
          };
        }

        // Ensure we have meaningful metadata
        memory.metadata = {
          ...memory.metadata,
          ...urlMetadata,
          title: urlMetadata.title || new URL(url).hostname,
          description: urlMetadata.description || 'No description available',
          mediaType: urlMetadata.mediaType || 'url',
          isPlayable: !!urlMetadata.playbackHtml,
          siteName: urlMetadata.siteName || new URL(url).hostname,
          favicon: urlMetadata.favicon || `https://www.google.com/s2/favicons?domain=${url}`
        };
      } else if (type === 'text' && content) {
        logger.info('Processing text content');
        memory.metadata = {
          ...memory.metadata,
          title: content.slice(0, 50),
          description: content,
          mediaType: 'text',
          rawContent: content
        };
      } else if (file) {
        logger.info('Processing file', { fileName });
        const buffer = Buffer.from(file, 'base64');
        memory.fileName = fileName;
        const fileMetadata = await extractFileMetadata(buffer, fileName);
        logger.debug('Extracted file metadata', { metadata: fileMetadata });
        memory.metadata = {
          ...memory.metadata,
          ...fileMetadata,
          mediaType: type,
          isPlayable: ['video', 'audio'].includes(type),
          fileSize: buffer.length,
          contentType: fileMetadata.contentType || contentType
        };
        memory.file = file;
      }
    } catch (error) {
      logger.error('Error processing content', error, { type });
      memory.metadata = {
        ...memory.metadata,
        error: 'Failed to process content',
        description: error.message
      };
    }

    // Insert memory into database
    logger.info('Inserting memory into database...');
    const result = await memories.insertOne(memory);
    
    if (!result.acknowledged) {
      throw new Error('Failed to insert memory');
    }

    logger.info('Memory created successfully', { id: result.insertedId });

    // Remove the file content from the response to reduce payload size
    const responseMemory = { 
      ...memory,
      _id: result.insertedId.toString(),
      metadata: {
        ...memory.metadata,
        lastModified: new Date().toISOString()
      }
    };
    
    if (responseMemory.file) {
      delete responseMemory.file;
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Memory created successfully',
        memory: responseMemory
      })
    };
  } catch (error) {
    logger.error('Error creating memory', error);
    
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
