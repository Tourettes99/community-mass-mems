require('dotenv').config();
const { MongoClient } = require('mongodb');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const emailNotification = require('./services/emailNotification');

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Media file extensions
const MEDIA_EXTENSIONS = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif'],
  videos: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'm4v', 'mkv', '3gp'],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma', 'aiff'],
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'md', 'json']
};

const getUrlMetadata = async (urlString) => {
  try {
    const url = new URL(urlString);
    const domain = url.hostname.replace('www.', '');
    const extension = url.pathname.split('.').pop()?.toLowerCase();
    
    // Basic metadata
    const metadata = {
      url: urlString,
      domain,
      type: 'url',
      isSecure: url.protocol === 'https:',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Handle Discord CDN
    if (domain.includes('cdn.discordapp.com') || domain.includes('media.discordapp.net')) {
      metadata.isDiscordCdn = true;
      
      // Handle media files
      if (extension) {
        if (MEDIA_EXTENSIONS.videos.includes(extension)) {
          metadata.mediaType = 'video';
          metadata.format = `video/${extension}`;
        } else if (MEDIA_EXTENSIONS.images.includes(extension)) {
          metadata.mediaType = 'image';
          metadata.format = `image/${extension}`;
        } else if (MEDIA_EXTENSIONS.audio.includes(extension)) {
          metadata.mediaType = 'audio';
          metadata.format = `audio/${extension}`;
        }
        
        // Add expiration info from URL
        const exParam = url.searchParams.get('ex');
        if (exParam) {
          metadata.expiresAt = new Date(parseInt(exParam, 16) * 1000).toISOString();
        }
      }
    }
    
    // Handle YouTube
    else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      metadata.platform = 'youtube';
      metadata.type = 'video';
      metadata.mediaType = 'video';
      
      const videoId = domain.includes('youtu.be') 
        ? url.pathname.slice(1)
        : url.searchParams.get('v');
      
      if (videoId) {
        metadata.videoId = videoId;
        metadata.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        metadata.embedUrl = `https://www.youtube.com/embed/${videoId}`;
        metadata.embedHtml = `<iframe 
          width="560" 
          height="315" 
          src="https://www.youtube.com/embed/${videoId}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
        ></iframe>`;
        
        // Try to fetch additional metadata
        try {
          const response = await fetch(`https://www.youtube.com/oembed?url=${urlString}&format=json`);
          if (response.ok) {
            const data = await response.json();
            metadata.title = data.title;
            metadata.description = data.description;
            metadata.width = data.width;
            metadata.height = data.height;
            metadata.author = data.author_name;
            metadata.authorUrl = data.author_url;
          }
        } catch (error) {
          console.error('Error fetching YouTube metadata:', error);
        }
      }
    }

    // Handle Vimeo
    else if (domain.includes('vimeo.com')) {
      metadata.platform = 'vimeo';
      metadata.type = 'video';
      metadata.mediaType = 'video';
      
      const videoId = url.pathname.split('/').pop();
      if (videoId) {
        metadata.videoId = videoId;
        metadata.embedUrl = `https://player.vimeo.com/video/${videoId}`;
        metadata.embedHtml = `<iframe 
          src="https://player.vimeo.com/video/${videoId}"
          frameborder="0" 
          allow="autoplay; fullscreen; picture-in-picture" 
          allowfullscreen
        ></iframe>`;
        
        try {
          const response = await fetch(`https://vimeo.com/api/oembed.json?url=${urlString}`);
          if (response.ok) {
            const data = await response.json();
            metadata.title = data.title;
            metadata.description = data.description;
            metadata.width = data.width;
            metadata.height = data.height;
            metadata.thumbnailUrl = data.thumbnail_url;
            metadata.author = data.author_name;
            metadata.authorUrl = data.author_url;
          }
        } catch (error) {
          console.error('Error fetching Vimeo metadata:', error);
        }
      }
    }

    return metadata;
  } catch (error) {
    console.error('Error getting URL metadata:', error);
    return {
      url: urlString,
      type: 'url',
      error: error.message
    };
  }
};

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let client;
  try {
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

    const { type, url, content, tags } = body;
    
    // Check if we have either URL or content
    if (type === 'url' && !url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required for URL type' })
      };
    }
    if (type === 'text' && !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content is required for text type' })
      };
    }

    // Get metadata based on type
    let metadata;
    if (type === 'url') {
      metadata = await getUrlMetadata(url);
    } else {
      metadata = {
        type: 'text',
        format: 'text/plain',
        title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        description: content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // Connect to MongoDB
    client = await MongoClient.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      family: 4
    });

    const db = client.db('memories');
    const collection = db.collection('memories');

    // Create memory document
    const memory = {
      type: type,
      url: type === 'url' ? url : undefined,
      content: type === 'text' ? content : undefined,
      tags: Array.isArray(tags) ? tags : [],
      status: 'pending',
      metadata: metadata,
      votes: { up: 0, down: 0 },
      userVotes: {},
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to database
    const result = await collection.insertOne(memory);
    memory._id = result.insertedId;
    
    // Send notification email using the email notification service
    await emailNotification.sendModerationNotification(memory, {
      decision: 'pending',
      reason: 'Awaiting moderation review',
      categories: [],
      flagged: false,
      category_scores: {}
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Memory submitted successfully',
        id: result.insertedId
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error submitting memory',
        error: error.message 
      })
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
};
