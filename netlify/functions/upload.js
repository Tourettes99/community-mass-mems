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
  tags: [String]
}, { timestamps: true });

// Create the Memory model
let Memory;
try {
  Memory = mongoose.model('Memory');
} catch {
  Memory = mongoose.model('Memory', memorySchema);
}

// Function to fetch URL metadata
const fetchUrlMetadata = async (url) => {
  try {
    const result = await unfurl(url, {
      follow: 5,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CommunityMassMems/1.0)'
      }
    });

    const metadata = {};

    // Only add fields if they exist in OpenGraph or Twitter Cards
    if (result.open_graph?.title || result.twitter_card?.title) {
      metadata.title = result.open_graph?.title || result.twitter_card?.title;
    }

    if (result.open_graph?.description || result.twitter_card?.description) {
      metadata.description = result.open_graph?.description || result.twitter_card?.description;
    }

    if (result.open_graph?.site_name) {
      metadata.siteName = result.open_graph.site_name;
    }

    if (result.favicon) {
      metadata.favicon = result.favicon;
    }

    // Handle media content
    if (result.open_graph?.video?.url || result.twitter_card?.player?.url) {
      metadata.mediaType = 'video';
      metadata.isPlayable = true;
      metadata.playbackHtml = `<iframe 
        width="100%" 
        style="aspect-ratio: 16/9;" 
        src="${result.open_graph?.video?.url || result.twitter_card?.player?.url}"
        frameborder="0" 
        allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
      </iframe>`;
    } else {
      metadata.mediaType = 'url';
    }

    // Only add preview URL if explicitly provided
    if (result.open_graph?.image?.url || result.twitter_card?.image?.url) {
      metadata.previewUrl = result.open_graph?.image?.url || result.twitter_card?.image?.url;
    }

    return metadata;
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    return {};
  }
};

exports.handler = async (event, context) => {
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
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { type, url, content, tags, file } = data;

    if (!type || !['url', 'image', 'video', 'audio', 'text'].includes(type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid memory type' })
      };
    }

    await mongoose.connect(process.env.MONGODB_URI);
    
    let memoryData = {
      type,
      tags: tags || []
    };

    switch (type) {
      case 'url':
        if (!url) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'URL is required for url type memories' })
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

        const metadata = await fetchUrlMetadata(url);
        memoryData.url = url;
        if (Object.keys(metadata).length > 0) {
          memoryData.metadata = metadata;
        }
        break;

      case 'text':
        if (!content?.trim()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Text content is required' })
          };
        }
        memoryData.content = content.trim();
        break;

      case 'image':
      case 'video':
      case 'audio':
        if (!file?.url) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `File is required for ${type} type memories` })
          };
        }
        
        memoryData.url = file.url;
        memoryData.metadata = {
          mediaType: type,
          ...(type === 'image' ? { previewUrl: file.url } : {
            isPlayable: true,
            playbackHtml: `<${type} controls><source src="${file.url}" type="${file.contentType}"></${type}>`
          })
        };
        break;
    }

    const memory = new Memory(memoryData);
    await memory.save();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Memory created successfully',
        memory
      })
    };

  } catch (error) {
    console.error('Error creating memory:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create memory',
        message: error.message 
      })
    };
  }
};
