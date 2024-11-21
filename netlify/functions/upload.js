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
    enum: ['image', 'gif', 'video', 'audio', 'document', 'url', 'text'],
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
    
    // Twitter Card metadata
    twitterCard: String,
    twitterTitle: String,
    twitterDescription: String,
    twitterImage: String,
    twitterCreator: String,
    
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
    
    // Custom metadata
    tags: [String],
    category: String,
    userNotes: String,
    customFields: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

// Create the Memory model
let Memory;
try {
  Memory = mongoose.model('Memory');
} catch {
  Memory = mongoose.model('Memory', memorySchema);
}

// Function to extract video ID from various platforms
const getVideoId = (url) => {
  let videoId = null;
  let platform = 'none';

  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    platform = 'youtube';
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (match) videoId = match[1];
  }
  // Vimeo
  else if (url.includes('vimeo.com')) {
    platform = 'vimeo';
    const match = url.match(/vimeo.com\/(?:.*\/)?([0-9]+)/);
    if (match) videoId = match[1];
  }
  // Twitter
  else if (url.includes('twitter.com') || url.includes('x.com')) {
    platform = 'twitter';
    const match = url.match(/twitter\.com\/\w+\/status\/(\d+)/);
    if (match) videoId = match[1];
  }

  return { videoId, platform };
};

// Function to generate embed HTML
const generateEmbedHtml = (url, platform, videoId) => {
  switch (platform) {
    case 'youtube':
      return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    case 'vimeo':
      return `<iframe src="https://player.vimeo.com/video/${videoId}" width="560" height="315" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    case 'twitter':
      return `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`;
    default:
      return null;
  }
};

// Function to fetch URL metadata
const fetchUrlMetadata = async (url) => {
  try {
    const result = await unfurl(url);
    const { videoId, platform } = getVideoId(url);
    const embedHtml = generateEmbedHtml(url, platform, videoId);

    return {
      // Basic metadata
      title: result.title,
      description: result.description,
      siteName: result.site_name || new URL(url).hostname,
      
      // Open Graph metadata
      ogTitle: result.open_graph?.title,
      ogDescription: result.open_graph?.description,
      ogImage: result.open_graph?.image?.url,
      ogType: result.open_graph?.type,
      ogUrl: result.open_graph?.url,
      
      // Twitter Card metadata
      twitterCard: result.twitter_card?.card,
      twitterTitle: result.twitter_card?.title,
      twitterDescription: result.twitter_card?.description,
      twitterImage: result.twitter_card?.image?.url,
      twitterCreator: result.twitter_card?.creator,
      
      // Article metadata
      articleSection: result.open_graph?.article?.section,
      articleTags: result.open_graph?.article?.tags,
      articlePublisher: result.open_graph?.article?.publisher,
      
      // Embed information
      embedType: platform,
      embedHtml: embedHtml,
      embedThumbnail: result.open_graph?.image?.url || result.twitter_card?.image?.url,
      
      // Additional metadata
      language: result.language,
      publishedDate: result.open_graph?.article?.published_time,
      modifiedDate: result.open_graph?.article?.modified_time,
      author: result.open_graph?.article?.author
    };
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    return {
      siteName: new URL(url).hostname,
      error: 'Failed to fetch metadata'
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
    const urlMetadata = await fetchUrlMetadata(url);

    const memoryData = {
      type: type || 'url',
      url: url,
      metadata: {
        ...urlMetadata,
        ...userMetadata
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
