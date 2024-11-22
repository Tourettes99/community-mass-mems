require('dotenv').config();
const mongoose = require('mongoose');
const Memory = require('./models/Memory');

// Media file extensions
const MEDIA_EXTENSIONS = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'],
  videos: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'm4v', 'mkv'],
  audio: ['mp3', 'wav', 'aac', 'm4a', 'opus', 'wma', 'flac'],
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
};

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

const isCloudStorageUrl = (domain) => {
  const cloudStorageProviders = ['drive.google.com', 'onedrive.live.com', 'dropbox.com'];
  return cloudStorageProviders.includes(domain);
};

const validateUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (e) {
    return false;
  }
};

const isMediaUrl = (url) => {
  const pathname = url.pathname.toLowerCase();
  const extension = pathname.split('.').pop();
  return Object.values(MEDIA_EXTENSIONS).flat().includes(extension);
};

const getUrlMetadata = async (urlString) => {
  try {
    const url = new URL(urlString);
    const domain = url.hostname.replace('www.', '');
    const pathname = url.pathname.toLowerCase();
    const extension = pathname.split('.').pop();

    // Basic metadata
    const metadata = {
      url: urlString,
      domain,
      protocol: url.protocol,
      type: 'url',
      isSecure: url.protocol === 'https:',
      createdAt: new Date().toISOString()
    };

    // Determine content type from extension
    if (MEDIA_EXTENSIONS.images.includes(extension)) {
      metadata.type = 'image';
      metadata.mediaType = 'image';
      metadata.fileType = extension;
    } else if (MEDIA_EXTENSIONS.videos.includes(extension)) {
      metadata.type = 'video';
      metadata.mediaType = 'video';
      metadata.fileType = extension;
    } else if (MEDIA_EXTENSIONS.audio.includes(extension)) {
      metadata.type = 'audio';
      metadata.mediaType = 'audio';
      metadata.fileType = extension;
    } else if (MEDIA_EXTENSIONS.documents.includes(extension)) {
      metadata.type = 'document';
      metadata.mediaType = 'document';
      metadata.fileType = extension;
    }

    // Additional metadata for media URLs
    if (metadata.type !== 'url') {
      metadata.contentUrl = urlString;
      metadata.title = pathname.split('/').pop() || 'Untitled';
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
    }

    // Validate media URLs
    if (metadata.type !== 'url') {
      try {
        const response = await fetch(urlString, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error('Media resource not accessible');
        }
        metadata.contentType = response.headers.get('content-type');
        metadata.contentLength = response.headers.get('content-length');
      } catch (error) {
        console.warn('Media validation failed:', error);
        metadata.warning = 'Media resource might not be accessible';
      }
    }

    return metadata;
  } catch (error) {
    console.error('Error extracting URL metadata:', error);
    return {
      url: urlString,
      type: 'url',
      error: 'Failed to extract metadata',
      createdAt: new Date().toISOString()
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
    const metadata = await getUrlMetadata(url);

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
