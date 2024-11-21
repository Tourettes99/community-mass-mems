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
    required: true,
    enum: ['url', 'image', 'video', 'audio', 'text']
  },
  url: String,
  content: String,
  metadata: {
    title: String,
    description: String,
    siteName: String,
    favicon: String,
    mediaType: String,
    previewUrl: String,
    playbackHtml: String,
    isPlayable: Boolean
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create the Memory model
let Memory;
try {
  Memory = mongoose.model('Memory');
} catch {
  Memory = mongoose.model('Memory', memorySchema);
}

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

    // Extract media information
    let mediaType = 'url';
    let previewUrl = null;
    let playbackHtml = null;
    let isPlayable = false;

    // Check for video/audio content
    if (result.open_graph?.video?.url || result.twitter_card?.player?.url) {
      mediaType = 'video';
      isPlayable = true;
      playbackHtml = `<iframe 
        width="100%" 
        style="aspect-ratio: 16/9;" 
        src="${result.open_graph?.video?.url || result.twitter_card?.player?.url}"
        frameborder="0" 
        allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
      </iframe>`;
    }

    // Get preview image
    previewUrl = result.open_graph?.image?.url || 
                 result.twitter_card?.image?.url ||
                 null;

    // Get basic metadata
    const title = userMetadata.title || 
                 result.open_graph?.title || 
                 result.twitter_card?.title ||
                 result.title ||
                 new URL(url).hostname;

    const description = userMetadata.description || 
                       result.open_graph?.description || 
                       result.twitter_card?.description ||
                       result.description || '';

    const siteName = userMetadata.siteName || 
                    result.open_graph?.site_name || 
                    new URL(url).hostname;

    const favicon = result.favicon || 
                   `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;

    return {
      title,
      description,
      siteName,
      favicon,
      mediaType,
      previewUrl,
      playbackHtml,
      isPlayable
    };
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    // Fallback to basic URL info
    const hostname = new URL(url).hostname;
    return {
      title: hostname,
      description: '',
      siteName: hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${hostname}`,
      mediaType: 'url',
      previewUrl: null,
      playbackHtml: null,
      isPlayable: false
    };
  }
};

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parse the incoming request
    const data = JSON.parse(event.body);
    const { type, url, content, tags } = data;

    // Validate required fields
    if (!type || !['url', 'image', 'video', 'audio', 'text'].includes(type)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid memory type' })
      };
    }

    // Connect to MongoDB
    if (!mongoose.connection.readyState) {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: DB_NAME
      });
    }
    
    let memoryData = {
      type,
      tags: tags || [],
      content
    };

    // Handle URL type memories
    if (type === 'url') {
      if (!url) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'URL is required for url type memories' })
        };
      }

      const urlMetadata = await fetchUrlMetadata(url);
      memoryData = {
        ...memoryData,
        url,
        metadata: {
          title: urlMetadata.title,
          description: urlMetadata.description,
          siteName: urlMetadata.siteName,
          favicon: urlMetadata.favicon,
          mediaType: urlMetadata.mediaType,
          previewUrl: urlMetadata.previewUrl,
          playbackHtml: urlMetadata.playbackHtml,
          isPlayable: urlMetadata.isPlayable
        }
      };
    }

    // Create and save the memory
    const memory = new Memory(memoryData);
    await memory.save();

    return {
      statusCode: 200,
      body: JSON.stringify(memory)
    };

  } catch (error) {
    console.error('Error creating memory:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create memory' })
    };
  }
};
