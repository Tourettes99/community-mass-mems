const mongoose = require('mongoose');
const { Buffer } = require('buffer');
const { extractUrlMetadata, extractFileMetadata } = require('./utils/metadata');
const { MongoClient } = require('mongodb');
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
    const client = await MongoClient.connect(MONGODB_URI);

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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

let Memory = mongoose.models.Memory || mongoose.model('Memory', memorySchema);

exports.handler = async (event, context) => {
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

    if (!type) {
      logger.warn('Missing type field');
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Type field is required' })
      };
    }

    // Validate based on type
    if (type === 'url' || type === 'image') {
      if (!url || !url.trim()) {
        logger.warn('Invalid URL provided', { url });
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid URL provided' })
        };
      }
      // Detect if URL is a direct media file
      const urlLower = url.toLowerCase();
      const isImageUrl = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/.test(urlLower);
      const isVideoUrl = /\.(mp4|webm|ogg|mov)(\?.*)?$/.test(urlLower);
      const isAudioUrl = /\.(mp3|wav|ogg|m4a)(\?.*)?$/.test(urlLower);
      
      // Override type if URL is a direct media file
      if (isImageUrl) {
        type = 'image';
      } else if (isVideoUrl) {
        type = 'video';
      } else if (isAudioUrl) {
        type = 'audio';
      }
    } else if (type === 'text') {
      if (!content) {
        logger.warn('Missing content for text type');
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Content is required for text type' })
        };
      }
    } else if (!file) {
      logger.warn('Missing file for non-text/url type');
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'File is required for this type' })
      };
    }

    logger.info('Connecting to database...');
    const { db } = await connectToDatabase();
    const memories = db.collection(COLLECTION_NAME);
    logger.debug(`Using collection: ${COLLECTION_NAME}`);

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

    logger.info('Processing content type:', { type });

    try {
      if (type === 'url' || type === 'image' || type === 'video' || type === 'audio') {
        logger.info('Processing URL/media', { url, type });
        memory.url = url;
        
        try {
          // For direct media URLs, set basic metadata
          if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|mp4|webm|ogg|mov|mp3|wav|m4a)(\?.*)?$/i)) {
            const urlObj = new URL(url);
            const fileName = urlObj.pathname.split('/').pop() || url;
            memory.metadata = {
              ...memory.metadata,
              title: fileName,
              description: `Direct ${type} URL`,
              mediaType: type,
              fileName: fileName,
              contentType: `${type}/${fileName.split('.').pop()}`,
              siteName: urlObj.hostname
            };
          } else {
            // For regular URLs, try to extract metadata
            const urlMetadata = await extractUrlMetadata(url);
            logger.debug('Extracted URL metadata', { metadata: urlMetadata });
            
            memory.metadata = {
              ...memory.metadata,
              ...urlMetadata,
              title: urlMetadata.title || new URL(url).hostname,
              description: urlMetadata.description || 'No description available',
              mediaType: urlMetadata.mediaType || type,
              isPlayable: !!urlMetadata.playbackHtml,
              siteName: urlMetadata.siteName || new URL(url).hostname,
              favicon: urlMetadata.favicon || `https://www.google.com/s2/favicons?domain=${url}`
            };
          }
        } catch (metadataError) {
          logger.error('Metadata extraction error', metadataError, { url });
          // Don't fail the upload if metadata extraction fails
          const urlObj = new URL(url);
          memory.metadata = {
            ...memory.metadata,
            title: urlObj.pathname.split('/').pop() || url,
            description: 'Failed to extract metadata',
            mediaType: type,
            siteName: urlObj.hostname
          };
        }
      } else if (type === 'text' && content) {
        logger.info('Processing text content');
        memory.content = content;
        memory.metadata = {
          ...memory.metadata,
          title: content.slice(0, 50),
          description: content,
          mediaType: 'text',
          rawContent: content
        };
      } else if (file) {
        logger.info('Processing file', { fileName });
        try {
          const buffer = Buffer.from(file, 'base64');
          
          // Ensure we have a fileName
          if (!fileName) {
            fileName = 'uploaded-file';
            const ext = contentType ? `.${contentType.split('/')[1]}` : '';
            fileName += ext;
          }
          
          // Store the file content
          memory.file = file;
          memory.fileName = fileName;
          
          try {
            const fileMetadata = await extractFileMetadata(buffer, fileName);
            logger.debug('Extracted file metadata', { metadata: fileMetadata });
            
            memory.metadata = {
              ...memory.metadata,
              ...fileMetadata,
              title: fileName,
              mediaType: type,
              isPlayable: ['video', 'audio'].includes(type),
              fileSize: buffer.length,
              contentType: fileMetadata.contentType || contentType || 'application/octet-stream'
            };
          } catch (fileError) {
            logger.error('File metadata extraction error', fileError, { fileName });
            // Don't fail the upload if metadata extraction fails
            memory.metadata = {
              ...memory.metadata,
              title: fileName,
              description: 'File upload',
              mediaType: type,
              fileSize: buffer.length,
              contentType: contentType || 'application/octet-stream'
            };
          }
        } catch (bufferError) {
          logger.error('Error processing file buffer', bufferError);
          throw new Error('Failed to process file data');
        }
      }
    } catch (error) {
      logger.error('Error processing content', error, { type });
      throw error;
    }

    try {
      logger.info('Saving memory to database');
      const result = await memories.insertOne(memory);
      logger.info('Memory saved successfully', { id: result.insertedId });

      return {
        statusCode: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'Memory created successfully',
          memory: { ...memory, _id: result.insertedId }
        })
      };
    } catch (dbError) {
      logger.error('Database error', dbError);
      throw new Error('Failed to save memory to database');
    }
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
