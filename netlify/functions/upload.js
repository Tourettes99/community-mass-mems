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
  try {
    const audio = new Audio();
    audio.src = url;
    return new Promise((resolve) => {
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      });
      audio.addEventListener('error', () => resolve(null));
    });
  } catch {
    return null;
  }
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
          // Try to get video duration
          metadata.duration = await getMediaDuration(url);
          break;

        case 'audio':
          metadata.isPlayable = true;
          metadata.playbackHtml = `<audio controls style="width: 100%;">
            <source src="${url}" type="${fileMetadata.contentType || 'audio/mpeg'}">
            Your browser does not support audio playback.
          </audio>`;
          // Try to get audio duration
          metadata.duration = await getMediaDuration(url);
          break;

        case 'image':
          metadata.previewUrl = url;
          // Try to get image dimensions
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
            // For text files, store first 2000 chars as preview
            metadata.rawContent = text.slice(0, 2000);
            
            // Try to detect encoding
            const encoding = response.headers.get('content-type')?.match(/charset=([^;]+)/)?.[1];
            if (encoding) {
              metadata.encoding = encoding;
            }
            
            // Set format based on extension
            const ext = path.extname(url).toLowerCase();
            metadata.format = ext.slice(1); // Remove the dot
            
            metadata.description = `Content preview (first ${metadata.rawContent.length} characters)`;
          } catch (error) {
            console.error('Error processing static file:', error);
          }
          break;
      }

      return metadata;
    }

    // Regular URL metadata extraction with enhanced error handling
    const result = await unfurl(url, {
      follow: 5,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CommunityMassMems/1.0)'
      }
    });

    const metadata = {
      mediaType: 'url',
      title: result.open_graph?.title || result.twitter_card?.title || result.title || url,
      description: result.open_graph?.description || result.twitter_card?.description || result.description,
      siteName: result.open_graph?.site_name || result.twitter_card?.site || new URL(url).hostname,
      favicon: result.favicon
    };

    // Enhanced media handling
    if (result.twitter_card?.player?.url || result.open_graph?.video?.url) {
      metadata.mediaType = 'video';
      metadata.isPlayable = true;
      const playerUrl = result.twitter_card?.player?.url || result.open_graph?.video?.url;
      const playerWidth = result.twitter_card?.player?.width || result.open_graph?.video?.width || '100%';
      const playerHeight = result.twitter_card?.player?.height || result.open_graph?.video?.height;
      const aspectRatio = playerHeight && playerWidth ? (playerHeight / playerWidth) * 100 : 56.25;
      
      metadata.playbackHtml = `<iframe 
        width="100%" 
        style="aspect-ratio: ${playerWidth}/${playerHeight || '9'};" 
        src="${playerUrl}"
        frameborder="0" 
        allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
      </iframe>`;

      // Try to get duration if available
      if (result.open_graph?.video?.duration) {
        metadata.duration = result.open_graph.video.duration;
      }
    } else if (result.oEmbed?.html) {
      metadata.mediaType = result.oEmbed.type || 'url';
      metadata.isPlayable = true;
      metadata.playbackHtml = result.oEmbed.html;
      
      if (result.oEmbed.title && !metadata.title) {
        metadata.title = result.oEmbed.title;
      }
      
      // Get additional oEmbed metadata
      if (result.oEmbed.width && result.oEmbed.height) {
        metadata.resolution = `${result.oEmbed.width}x${result.oEmbed.height}`;
      }
      if (result.oEmbed.duration) {
        metadata.duration = result.oEmbed.duration;
      }
    }

    // Enhanced preview image handling
    if (result.open_graph?.image?.url || result.twitter_card?.image?.url) {
      metadata.previewUrl = result.open_graph?.image?.url || result.twitter_card?.image?.url;
      
      // Try to get image dimensions
      const imageDimensions = result.open_graph?.image || result.twitter_card?.image;
      if (imageDimensions?.width && imageDimensions?.height) {
        metadata.resolution = `${imageDimensions.width}x${imageDimensions.height}`;
      }
    } else if (result.oEmbed?.thumbnail_url) {
      metadata.previewUrl = result.oEmbed.thumbnail_url;
      
      if (result.oEmbed.thumbnail_width && result.oEmbed.thumbnail_height) {
        metadata.resolution = `${result.oEmbed.thumbnail_width}x${result.oEmbed.thumbnail_height}`;
      }
    }

    // Clean up null/undefined values and validate
    Object.keys(metadata).forEach(key => {
      if (metadata[key] === null || metadata[key] === undefined) {
        delete metadata[key];
      }
    });

    return metadata;
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    // Return minimal metadata on error
    return {
      mediaType: 'url',
      title: url,
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
