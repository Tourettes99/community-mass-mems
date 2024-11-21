const mongoose = require('mongoose');
const { unfurl } = require('unfurl.js');
const fetch = require('node-fetch');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

const DB_NAME = 'memories';

// Memory Schema
const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'gif', 'video', 'audio', 'document', 'url', 'text', 'social'],
    required: true
  },
  url: String,
  content: String,
  metadata: {
    // Basic metadata
    title: String,
    description: String,
    siteName: String,
    author: String,
    publishedDate: Date,
    modifiedDate: Date,
    language: String,
    
    // Media metadata
    fileName: String,
    resolution: String,
    format: String,
    fps: Number,
    duration: String,
    bitrate: String,
    codec: String,
    contentType: String,
    size: {
      original: Number,
      compressed: Number
    },
    dimensions: {
      width: Number,
      height: Number
    },
    
    // Open Graph metadata
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    ogType: String,
    ogUrl: String,
    ogAudio: String,
    ogVideo: String,
    
    // Twitter Card metadata
    twitterCard: String,
    twitterTitle: String,
    twitterDescription: String,
    twitterImage: String,
    twitterCreator: String,
    twitterPlayer: String,
    
    // Article metadata
    articleSection: String,
    articleTags: [String],
    articlePublisher: String,
    
    // Embed information
    embedType: {
      type: String,
      enum: ['none', 'youtube', 'vimeo', 'twitter', 'instagram', 'spotify', 'soundcloud', 'general']
    },
    embedHtml: String,
    embedThumbnail: String,
    
    // Media and preview information
    mediaType: String,
    previewType: String,
    previewUrl: String,
    playbackHtml: String,
    isPlayable: Boolean,
    
    // Custom metadata
    tags: [String],
    category: String,
    userNotes: String,
    customFields: mongoose.Schema.Types.Mixed,
    
    // Additional metadata
    favicon: String,
    structuredData: mongoose.Schema.Types.Mixed,
    raw: mongoose.Schema.Types.Mixed,
    mediaData: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

// Create the Memory model
let Memory;
try {
  Memory = mongoose.model('Memory');
} catch {
  Memory = mongoose.model('Memory', memorySchema);
}

// Function to determine media type and preview
const getMediaInfo = async (url, metadata) => {
  // Media extensions
  const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
  const audioExts = ['.mp3', '.wav', '.ogg', '.m4a'];

  const urlObj = new URL(url);
  const path = urlObj.pathname.toLowerCase();

  let mediaType = 'url';
  let previewUrl = metadata?.ogImage || metadata?.twitterImage;
  let playbackHtml = null;
  let isPlayable = false;

  // Check if it's a direct media file
  if (videoExts.some(ext => path.endsWith(ext))) {
    mediaType = 'video';
    playbackHtml = `<video controls style="width: 100%; max-height: 400px;"><source src="${url}" type="video/${path.split('.').pop()}">Your browser does not support video playback.</video>`;
    isPlayable = true;
  } else if (audioExts.some(ext => path.endsWith(ext))) {
    mediaType = 'audio';
    playbackHtml = `<audio controls style="width: 100%;"><source src="${url}" type="audio/${path.split('.').pop()}">Your browser does not support audio playback.</audio>`;
    isPlayable = true;
  } else {
    // Check for embedded media in metadata
    const ogVideo = metadata?.ogVideo || metadata?.openGraph?.video?.url;
    const ogAudio = metadata?.ogAudio || metadata?.openGraph?.audio?.url;
    const twitterPlayer = metadata?.twitterPlayer || metadata?.twitterCard?.player?.url;
    
    if (ogVideo) {
      mediaType = 'video';
      if (ogVideo.endsWith('.mp4')) {
        playbackHtml = `<video controls style="width: 100%; max-height: 400px;"><source src="${ogVideo}" type="video/mp4">Your browser does not support video playback.</video>`;
      } else {
        playbackHtml = `<iframe src="${ogVideo}" style="width: 100%; aspect-ratio: 16/9; border: none;" allowfullscreen></iframe>`;
      }
      isPlayable = true;
    } else if (ogAudio) {
      mediaType = 'audio';
      if (ogAudio.endsWith('.mp3')) {
        playbackHtml = `<audio controls style="width: 100%;"><source src="${ogAudio}" type="audio/mpeg">Your browser does not support audio playback.</audio>`;
      } else {
        playbackHtml = `<iframe src="${ogAudio}" style="width: 100%; height: 80px; border: none;"></iframe>`;
      }
      isPlayable = true;
    } else if (twitterPlayer) {
      mediaType = 'video';
      playbackHtml = `<iframe src="${twitterPlayer}" style="width: 100%; aspect-ratio: 16/9; border: none;" allowfullscreen></iframe>`;
      isPlayable = true;
    }
  }

  return {
    mediaType,
    previewUrl,
    playbackHtml,
    isPlayable
  };
};

// Function to fetch URL metadata
const fetchUrlMetadata = async (url, userMetadata = {}) => {
  try {
    const result = await unfurl(url, {
      follow: 5,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CommunityMassMems/1.0)'
      }
    });
    
    const mediaInfo = await getMediaInfo(url, {
      ogImage: result.open_graph?.image?.url,
      twitterImage: result.twitter_card?.image?.url,
      ogVideo: result.open_graph?.video?.url,
      ogAudio: result.open_graph?.audio?.url,
      twitterPlayer: result.twitter_card?.player?.url,
      openGraph: result.open_graph,
      twitterCard: result.twitter_card
    });

    // Get favicon
    const favicon = result.favicon || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;

    // Get title
    const title = userMetadata.title || 
                 result.open_graph?.title || 
                 result.twitter_card?.title ||
                 result.title ||
                 '';

    // Get description
    const description = userMetadata.description || 
                       result.open_graph?.description || 
                       result.twitter_card?.description ||
                       result.description || '';

    // Get site name
    const siteName = userMetadata.siteName || 
                    result.open_graph?.site_name || 
                    new URL(url).hostname;

    return {
      title,
      description,
      siteName,
      favicon,
      mediaType: mediaInfo.mediaType,
      previewUrl: mediaInfo.previewUrl,
      playbackHtml: mediaInfo.playbackHtml,
      isPlayable: mediaInfo.isPlayable,
      // Store raw media data for debugging
      mediaData: {
        ogVideo: result.open_graph?.video,
        ogAudio: result.open_graph?.audio,
        twitterPlayer: result.twitter_card?.player
      }
    };
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    return {
      title: '',
      description: '',
      siteName: new URL(url).hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`,
      mediaType: 'url'
    };
  }
};

exports.handler = async (event, context) => {
  console.log('Starting upload handler');
  
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
    console.log('Connecting to MongoDB...');
    if (!mongoose.connection.readyState) {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: DB_NAME
      });
    }
    console.log('Connected to MongoDB successfully');

    const body = JSON.parse(event.body);
    console.log('Received request body:', body);

    const { url, type, content, metadata: userMetadata } = body;

    // Handle text upload
    if (type === 'text') {
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Text content is required' })
        };
      }

      const memoryData = {
        type: 'text',
        content: content.trim(),
        metadata: {
          contentType: 'text/plain',
          ...userMetadata,
          size: {
            original: content.length,
            compressed: content.length
          }
        }
      };

      console.log('Creating new text memory');
      const memory = new Memory(memoryData);
      const savedMemory = await memory.save();
      console.log('Memory saved successfully:', savedMemory._id);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'Upload successful',
          memory: {
            _id: savedMemory._id,
            type: savedMemory.type,
            content: savedMemory.content,
            metadata: savedMemory.metadata,
            createdAt: savedMemory.createdAt
          }
        })
      };
    }

    // Handle URL upload
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required for non-text uploads' })
      };
    }

    try {
      new URL(url);
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid URL format' })
      };
    }

    console.log('Fetching metadata for URL:', url);
    const urlMetadata = await fetchUrlMetadata(url, userMetadata);
    
    const memoryData = {
      type: type || urlMetadata.mediaType || 'url',
      url: url,
      metadata: {
        title: urlMetadata.title,
        description: urlMetadata.description,
        siteName: urlMetadata.siteName,
        favicon: urlMetadata.favicon,
        mediaType: urlMetadata.mediaType,
        previewUrl: urlMetadata.previewUrl,
        playbackHtml: urlMetadata.playbackHtml,
        isPlayable: urlMetadata.isPlayable,
        mediaData: urlMetadata.mediaData
      }
    };

    console.log('Creating new URL memory:', JSON.stringify(memoryData, null, 2));
    const memory = new Memory(memoryData);
    const savedMemory = await memory.save();
    console.log('Memory saved successfully:', savedMemory._id);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Upload successful',
        memory: {
          _id: savedMemory._id,
          type: savedMemory.type,
          url: savedMemory.url,
          metadata: savedMemory.metadata,
          createdAt: savedMemory.createdAt
        }
      })
    };
  } catch (error) {
    console.error('Error processing upload:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      })
    };
  }
};
