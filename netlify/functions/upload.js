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
    mediaType: {
      type: String,
      enum: ['url', 'image', 'video', 'audio']
    },
    previewUrl: String,
    playbackHtml: String,
    isPlayable: Boolean
  },
  tags: [String]
}, { 
  timestamps: true,
  strict: true // Prevent adding fields not in schema
});

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

    // Start with minimal metadata object
    const metadata = {
      mediaType: 'url' // Default type for URLs
    };

    // Title is important - try multiple sources
    if (result.open_graph?.title || result.twitter_card?.title || result.title) {
      metadata.title = result.open_graph?.title || result.twitter_card?.title || result.title;
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

    // Handle embedded media content
    // Check for video players first
    if (result.twitter_card?.player?.url || result.open_graph?.video?.url) {
      metadata.mediaType = 'video';
      metadata.isPlayable = true;
      const playerUrl = result.twitter_card?.player?.url || result.open_graph?.video?.url;
      metadata.playbackHtml = playerUrl ? `<iframe 
        width="100%" 
        style="aspect-ratio: 16/9;" 
        src="${playerUrl}"
        frameborder="0" 
        allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
      </iframe>` : null;
    }
    // Check for oEmbed support
    else if (result.oEmbed?.html) {
      metadata.mediaType = result.oEmbed.type || 'url';
      metadata.isPlayable = true;
      metadata.playbackHtml = result.oEmbed.html;
      // If oEmbed provides better metadata, use it
      if (result.oEmbed.title && !metadata.title) {
        metadata.title = result.oEmbed.title;
      }
    }

    // Handle preview images
    if (result.open_graph?.image?.url || result.twitter_card?.image?.url) {
      metadata.previewUrl = result.open_graph?.image?.url || result.twitter_card?.image?.url;
    }
    // Fallback to oEmbed thumbnail if no OG/Twitter image
    else if (result.oEmbed?.thumbnail_url) {
      metadata.previewUrl = result.oEmbed.thumbnail_url;
    }

    // Remove any null/undefined values
    Object.keys(metadata).forEach(key => {
      if (metadata[key] === null || metadata[key] === undefined) {
        delete metadata[key];
      }
    });

    return metadata;
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    // Return URL with original URL as title if nothing else works
    return { 
      mediaType: 'url',
      title: url
    };
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

    await mongoose.connect(MONGODB_URI);
    
    // Start with minimal memory data
    let memoryData = {
      type,
      tags: Array.isArray(tags) ? tags : [] // Ensure tags is always an array
    };

    switch (type) {
      case 'url':
        if (!url?.trim()) {
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

        memoryData.url = url.trim();
        const metadata = await fetchUrlMetadata(url);
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
        if (!file?.url?.trim()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `File URL is required for ${type} type memories` })
          };
        }
        
        if (!file.contentType?.includes(type)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Invalid content type for ${type} file` })
          };
        }

        memoryData.url = file.url.trim();
        memoryData.metadata = {
          mediaType: type,
          title: file.name || file.url.split('/').pop(), // Use filename or last part of URL
          ...(type === 'image' ? {
            previewUrl: file.url.trim()
          } : {
            isPlayable: true,
            playbackHtml: `<${type} controls>
              <source src="${file.url.trim()}" type="${file.contentType}">
            </${type}>`
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
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
