require('dotenv').config();
const mongoose = require('mongoose');
const Memory = require('./models/Memory');

// Common media file extensions
const MEDIA_EXTENSIONS = [
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff',
  // Videos
  'mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'm4v', 'mkv',
  // Audio
  'mp3', 'wav', 'aac', 'm4a', 'opus', 'wma', 'flac',
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
];

let conn = null;

const connectDb = async () => {
  if (conn == null) {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }
  return conn;
};

const validateUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (e) {
    return false;
  }
};

const getUrlMetadata = (url) => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const pathname = urlObj.pathname.toLowerCase();
    
    // Basic metadata
    const metadata = {
      domain,
      url,
      type: 'url',
      title: url,
      isSecure: urlObj.protocol === 'https:'
    };

    // Check if it's a media file by extension
    const extension = pathname.split('.').pop().toLowerCase();
    if (MEDIA_EXTENSIONS.includes(extension)) {
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'].includes(extension)) {
        metadata.type = 'image';
      } else if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'm4v', 'mkv'].includes(extension)) {
        metadata.type = 'video';
      } else if (['mp3', 'wav', 'aac', 'm4a', 'opus', 'wma', 'flac'].includes(extension)) {
        metadata.type = 'audio';
      } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
        metadata.type = 'document';
      }
    }

    // Platform-specific metadata
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      metadata.platform = 'youtube';
      metadata.type = 'video';
    } else if (domain.includes('vimeo.com')) {
      metadata.platform = 'vimeo';
      metadata.type = 'video';
    } else if (domain.includes('spotify.com')) {
      metadata.platform = 'spotify';
      metadata.type = 'audio';
    } else if (domain.includes('soundcloud.com')) {
      metadata.platform = 'soundcloud';
      metadata.type = 'audio';
    } else if (domain.includes('instagram.com')) {
      metadata.platform = 'instagram';
      metadata.type = 'social';
    } else if (domain.includes('twitter.com')) {
      metadata.platform = 'twitter';
      metadata.type = 'social';
    } else if (domain.includes('facebook.com')) {
      metadata.platform = 'facebook';
      metadata.type = 'social';
    } else if (domain.includes('github.com')) {
      metadata.platform = 'github';
      metadata.type = 'code';
    }

    return metadata;
  } catch (error) {
    console.error('Error getting URL metadata:', error);
    return {
      type: 'url',
      title: url
    };
  }
};

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Allow': 'POST' },
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    const { url, tags = [] } = JSON.parse(event.body);
    
    // Validate URL
    if (!url || typeof url !== 'string' || !validateUrl(url)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          message: 'Invalid URL. Please provide a valid HTTP or HTTPS URL.',
          error: 'URL validation failed'
        })
      };
    }

    // Validate tags
    if (!Array.isArray(tags)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Tags must be an array' })
      };
    }

    // Connect to database
    await connectDb();

    // Get URL metadata
    const metadata = getUrlMetadata(url);

    // Create memory
    const memory = new Memory({
      type: metadata.type || 'url',
      content: url,
      tags: tags.map(tag => tag.trim()).filter(tag => tag.length > 0),
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString()
      }
    });

    // Save memory
    await memory.save();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'URL memory created successfully',
        memory
      })
    };
  } catch (error) {
    console.error('Error creating URL memory:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Error creating URL memory',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
