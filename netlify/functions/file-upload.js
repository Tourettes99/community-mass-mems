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

const MONGODB_URI = 'mongodb+srv://davidpthomsen:Gamer6688@cluster0.rz2oj.mongodb.net/memories?authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

let cachedDb = null;
let cachedClient = null;

async function connectToDatabase() {
  if (cachedDb && cachedClient) {
    console.log('Using cached database connection');
    return { db: cachedDb, client: cachedClient };
  }

  try {
    console.log('Connecting to MongoDB...');
    const client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increased timeout
      maxPoolSize: 10,
      socketTimeoutMS: 45000, // Added socket timeout
      connectTimeoutMS: 30000 // Added connect timeout
    });

    const db = client.db('memories');
    cachedDb = db;
    cachedClient = client;
    console.log('MongoDB connected successfully to memories database');
    return { db, client };
  } catch (error) {
    console.error('MongoDB connection error:', {
      message: error.message,
      stack: error.stack,
      code: error.code
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
    console.error('Error extracting URL metadata:', error);
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
        console.error('Error getting image dimensions:', err);
      }
    }
    
    return metadata;
  } catch (error) {
    console.error('Error extracting file metadata:', error);
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

  // Important: this prevents function timeout from waiting for MongoDB connection to close
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    console.log('Request received:', {
      method: event.httpMethod,
      path: event.path,
      headers: event.headers
    });

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    let data;
    try {
      data = JSON.parse(event.body);
      console.log('Parsed request body:', {
        type: data.type,
        hasUrl: !!data.url,
        hasContent: !!data.content,
        hasFile: !!data.file,
        fileName: data.fileName
      });
    } catch (error) {
      console.error('Error parsing request body:', error);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid request body' })
      };
    }

    const { type, url, content, tags, file, fileName, contentType } = data;

    if (!type || (!url && !content && !file)) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Connect to database
    console.log('Connecting to database...');
    const { db } = await connectToDatabase();
    const memories = db.collection('memories');

    // Prepare memory document
    const memory = {
      type,
      tags: tags || [],
      createdAt: new Date().toISOString(), // Convert to ISO string for frontend
      metadata: {
        title: '',
        description: '',
        mediaType: type,
        contentType: contentType || 'text/plain'
      }
    };

    console.log('Processing content type:', type);

    // Handle different types of content
    try {
      if (type === 'url' && url) {
        console.log('Processing URL:', url);
        memory.url = url;
        const urlMetadata = await extractUrlMetadata(url);
        memory.metadata = {
          ...memory.metadata,
          ...urlMetadata,
          mediaType: urlMetadata.mediaType || 'url',
          isPlayable: !!urlMetadata.playbackHtml
        };
      } else if (type === 'text' && content) {
        console.log('Processing text content');
        memory.content = content;
        memory.metadata = {
          ...memory.metadata,
          title: content.slice(0, 50),
          description: content,
          mediaType: 'text',
          rawContent: content
        };
      } else if (file) {
        console.log('Processing file:', fileName);
        const buffer = Buffer.from(file, 'base64');
        memory.fileName = fileName;
        const fileMetadata = await extractFileMetadata(buffer, fileName);
        memory.metadata = {
          ...memory.metadata,
          ...fileMetadata,
          mediaType: type,
          isPlayable: ['video', 'audio'].includes(type),
          fileSize: buffer.length,
          contentType: fileMetadata.contentType || contentType
        };
        memory.file = file; // Store base64 file data
      }
    } catch (error) {
      console.error('Error processing content:', error);
      memory.metadata = {
        ...memory.metadata,
        error: 'Failed to process content',
        description: error.message
      };
    }

    // Insert memory into database
    console.log('Inserting memory into database...');
    const result = await memories.insertOne(memory);
    
    if (!result.acknowledged) {
      throw new Error('Failed to insert memory');
    }

    console.log('Memory created successfully:', result.insertedId);

    // Remove the file content from the response to reduce payload size
    const responseMemory = { 
      ...memory,
      _id: result.insertedId.toString(), // Convert ObjectId to string
      metadata: {
        ...memory.metadata,
        lastModified: new Date().toISOString() // Add lastModified date
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
    console.error('Error creating memory:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
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
