const mongoose = require('mongoose');
const { unfurl } = require('unfurl.js');
const fetch = require('node-fetch');
const path = require('path');
const fileType = require('file-type');

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

// File type definitions
const FILE_TYPES = {
  video: ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.m4v'],
  audio: ['.mp3', '.wav', '.aac', '.ogg', '.m4a', '.flac', '.wma'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'],
  static: ['.txt', '.html', '.json', '.xml', '.md', '.csv']
};

// Memory Schema with enhanced metadata
const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['url', 'image', 'video', 'audio', 'text', 'static']
  },
  url: String,
  content: String,
  metadata: {
    title: String,
    description: String,
    siteName: String,
    favicon: String,
    mediaType: {
      type: String,
      enum: ['url', 'image', 'video', 'audio', 'static']
    },
    previewUrl: String,
    playbackHtml: String,
    isPlayable: Boolean,
    // Enhanced metadata fields
    fileSize: Number,
    contentType: String,
    resolution: String,
    duration: String,
    format: String,
    encoding: String,
    lastModified: Date,
    rawContent: String // For static content preview
  },
  tags: [String]
}, { 
  timestamps: true,
  strict: true
});

let Memory;
try {
  Memory = mongoose.model('Memory');
} catch {
  Memory = mongoose.model('Memory', memorySchema);
}

// Helper function to determine file type from URL
const getUrlFileType = (url) => {
  const ext = path.extname(url).toLowerCase();
  for (const [type, extensions] of Object.entries(FILE_TYPES)) {
    if (extensions.includes(ext)) {
      return type;
    }
  }
  return null;
};

// Enhanced file metadata extraction function
const getFileMetadata = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const size = parseInt(response.headers.get('content-length') || '0');
    const contentType = response.headers.get('content-type');
    const lastModified = response.headers.get('last-modified');

    // Try to detect file type using file-type library
    let detectedType;
    try {
      const fileBuffer = await fetch(url).then(res => res.buffer());
      detectedType = await fileType.fromBuffer(fileBuffer);
    } catch (error) {
      console.error('Error detecting file type:', error);
    }

    return {
      fileSize: size,
      contentType: detectedType?.mime || contentType,
      format: detectedType?.ext,
      lastModified: lastModified ? new Date(lastModified) : undefined
    };
  } catch (error) {
    console.error('Error fetching file metadata:', error);
    return {};
  }
};

// Function to get media duration (for audio/video)
const getMediaDuration = async (url) => {
  // For now, we'll skip duration detection since it requires ffmpeg
  // TODO: Implement duration detection using ffmpeg
  return null;
};

// Function to fetch URL metadata with enhanced file handling
const fetchUrlMetadata = async (url) => {
  try {
    // Check if URL is a direct file
    const fileType = getUrlFileType(url);
    if (fileType) {
      const fileMetadata = await getFileMetadata(url);
      const metadata = {
        mediaType: fileType,
        title: path.basename(url),
        ...fileMetadata
      };

      // Handle different file types
      switch (fileType) {
        case 'video':
          metadata.isPlayable = true;
          metadata.playbackHtml = `<video controls style="width: 100%; max-height: 400px;">
            <source src="${url}" type="${fileMetadata.contentType || 'video/mp4'}">
            Your browser does not support video playback.
          </video>`;
          break;

        case 'audio':
          metadata.isPlayable = true;
          metadata.playbackHtml = `<audio controls style="width: 100%;">
            <source src="${url}" type="${fileMetadata.contentType || 'audio/mpeg'}">
            Your browser does not support audio playback.
          </audio>`;
          break;

        case 'image':
          metadata.previewUrl = url;
          try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const dimensions = await import('image-size').then(({ default: sizeOf }) => sizeOf(buffer));
            if (dimensions.width && dimensions.height) {
              metadata.resolution = `${dimensions.width}x${dimensions.height}`;
            }
          } catch (error) {
            console.error('Error getting image dimensions:', error);
          }
          break;

        case 'static':
          try {
            const response = await fetch(url);
            const text = await response.text();
            metadata.rawContent = text.slice(0, 2000);
            metadata.description = `Content preview (first ${metadata.rawContent.length} characters)`;
            
            const encoding = response.headers.get('content-type')?.match(/charset=([^;]+)/)?.[1];
            if (encoding) {
              metadata.encoding = encoding;
            }
            
            const ext = path.extname(url).toLowerCase();
            metadata.format = ext.slice(1);
          } catch (error) {
            console.error('Error processing static file:', error);
          }
          break;
      }

      return metadata;
    }

    // Regular URL metadata extraction
    const result = await unfurl(url);
    return {
      title: result.title,
      description: result.description,
      siteName: result.site_name,
      favicon: result.favicon,
      mediaType: 'url',
      previewUrl: result.open_graph?.images?.[0]?.url || result.twitter_card?.images?.[0]?.url
    };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return {
      title: url,
      mediaType: 'url',
      description: 'Failed to fetch metadata'
    };
  }
};

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // Validate request method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
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

    // Validate required fields
    if (!body.type || !['url', 'image', 'video', 'audio', 'text', 'static'].includes(body.type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid memory type' })
      };
    }

    // Initialize memory object
    const memoryData = {
      type: body.type,
      tags: body.tags || []
    };

    // Handle different memory types
    switch (body.type) {
      case 'url': {
        if (!body.url) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'URL is required for URL type memories' })
          };
        }

        try {
          // Validate URL format
          new URL(body.url);
        } catch (error) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid URL format' })
          };
        }

        memoryData.url = body.url;
        // Fetch metadata with enhanced error handling
        try {
          memoryData.metadata = await fetchUrlMetadata(body.url);
        } catch (error) {
          console.error('Error fetching URL metadata:', error);
          memoryData.metadata = {
            title: body.url,
            mediaType: 'url',
            description: 'Failed to fetch metadata'
          };
        }
        break;
      }

      case 'text': {
        if (!body.content) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Content is required for text type memories' })
          };
        }

        memoryData.content = body.content;
        memoryData.metadata = {
          title: body.content.slice(0, 50) + (body.content.length > 50 ? '...' : ''),
          mediaType: 'text',
          description: body.content,
          contentType: 'text/plain',
          fileSize: Buffer.byteLength(body.content, 'utf8'),
          encoding: 'utf-8',
          format: 'txt'
        };
        break;
      }

      case 'image':
      case 'video':
      case 'audio':
      case 'static': {
        if (!body.url) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `URL is required for ${body.type} type memories` })
          };
        }

        try {
          // Validate URL format
          new URL(body.url);
        } catch (error) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid URL format' })
          };
        }

        memoryData.url = body.url;
        // Fetch file metadata with enhanced error handling
        try {
          memoryData.metadata = await fetchUrlMetadata(body.url);
        } catch (error) {
          console.error(`Error fetching ${body.type} metadata:`, error);
          memoryData.metadata = {
            title: path.basename(body.url),
            mediaType: body.type,
            description: `Failed to fetch ${body.type} metadata`
          };
        }
        break;
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Unsupported memory type' })
        };
    }

    // Create new memory
    const memory = new Memory(memoryData);
    
    try {
      await memory.validate();
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Validation failed',
          details: Object.values(error.errors).map(err => err.message)
        })
      };
    }

    // Save to database with retry mechanism
    let savedMemory;
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        savedMemory = await memory.save();
        break;
      } catch (error) {
        if (i === maxRetries - 1) {
          console.error('Failed to save memory after retries:', error);
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Memory created successfully',
        memory: savedMemory
      })
    };

  } catch (error) {
    console.error('Server error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
