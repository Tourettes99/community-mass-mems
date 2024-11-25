require('dotenv').config();
const { MongoClient } = require('mongodb');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

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
    
    // Basic metadata
    const metadata = {
      url: urlString,
      domain,
      type: 'url',
      isSecure: url.protocol === 'https:',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Platform-specific metadata
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
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
        
        // Fetch video details from YouTube oEmbed API
        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
          const response = await fetch(oembedUrl);
          const data = await response.json();
          
          if (data) {
            metadata.title = data.title;
            metadata.author = data.author_name;
            metadata.authorUrl = data.author_url;
            metadata.thumbnailUrl = data.thumbnail_url || metadata.thumbnailUrl;
            metadata.thumbnailWidth = data.thumbnail_width;
            metadata.thumbnailHeight = data.thumbnail_height;
            metadata.html = data.html;
          }
        } catch (error) {
          console.error('Error fetching YouTube metadata:', error);
        }
      }
    }

    return metadata;
  } catch (error) {
    console.error('Error getting URL metadata:', error);
    return {
      type: 'url',
      url: urlString,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
    
    // Send notification email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `New ${type.toUpperCase()} Memory Submission for Review`,
        text: `New ${type} memory submitted for review:

${type === 'url' ? `URL: ${url}` : `Content: ${content}`}
Title: ${metadata.title || 'No title'}
Tags: ${memory.tags.join(', ') || 'No tags'}
Submitted at: ${new Date().toLocaleString()}

ID: ${result.insertedId}

You can review this submission in the moderation console.`
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Continue even if email fails
    }

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
