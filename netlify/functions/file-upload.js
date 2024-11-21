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
    return { db: cachedDb, client: cachedClient };
  }

  try {
    console.log('Connecting to MongoDB...');
    const client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10
    });

    const db = client.db('memories');
    cachedDb = db;
    cachedClient = client;
    console.log('MongoDB connected successfully to memories database');
    return { db, client };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

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
  context.callbackWaitsForEmptyEventLoop = false;

  console.log('Function invoked with event:', {
    method: event.httpMethod,
    headers: event.headers,
    path: event.path
  });

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    await connectToDatabase();
    
    let body;
    try {
      console.log('Raw request body:', event.body);
      body = JSON.parse(event.body);
      console.log('Parsed body:', body);
    } catch (error) {
      console.error('Error parsing request body:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid request body',
          details: error.message 
        })
      };
    }

    if (!body.type || !['url', 'image', 'video', 'audio', 'text', 'static', 'social'].includes(body.type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid memory type' })
      };
    }

    // Extract metadata based on type
    let metadata = {};
    if (body.type === 'url' && body.url) {
      metadata = await extractUrlMetadata(body.url);
    } else if (body.type === 'text') {
      metadata = {
        title: body.content?.slice(0, 50),
        description: body.content,
        mediaType: 'text'
      };
    } else if (body.file) {
      const buffer = Buffer.from(body.file, 'base64');
      metadata = await extractFileMetadata(buffer, body.fileName || 'unknown');
    }

    // Create memory object with metadata
    const memoryData = {
      type: metadata.mediaType || body.type,
      url: body.url || '',
      content: body.content || '',
      tags: body.tags || [],
      metadata: {
        ...metadata,
        title: metadata.title || (body.type === 'text' ? body.content?.slice(0, 50) : body.url),
        description: metadata.description || body.content || body.url
      }
    };

    console.log('Creating memory with data:', memoryData);
    
    const memory = new Memory(memoryData);
    await memory.validate();
    const savedMemory = await memory.save();
    console.log('Memory saved successfully:', savedMemory._id);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Memory created successfully',
        memory: savedMemory
      })
    };

  } catch (error) {
    console.error('Error processing request:', error);
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
