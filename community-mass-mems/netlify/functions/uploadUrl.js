require('dotenv').config();
const mongoose = require('mongoose');
const Memory = require('./models/Memory');
const unfurl = require('unfurl.js');
const fetch = require('node-fetch');
const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');

// Initialize SendGrid if API key is available
let emailConfigured = false;
if (process.env.SENDGRID_API_KEY) {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    emailConfigured = true;
  } catch (error) {
    console.error('Error configuring SendGrid:', error);
  }
}

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',  // Use Gmail service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

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

const formatDate = (date) => {
  if (!date) return null;
  try {
    return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return null;
  }
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
      createdAt: formatDate(new Date()),
      updatedAt: formatDate(new Date())
    };

    // Try to fetch rich metadata first
    try {
      const unfurled = await unfurl(urlString);
      
      // Merge unfurled metadata
      if (unfurled) {
        metadata.title = unfurled.title;
        metadata.description = unfurled.description;
        
        if (unfurled.open_graph) {
          metadata.ogTitle = unfurled.open_graph.title;
          metadata.ogDescription = unfurled.open_graph.description;
          metadata.ogImage = unfurled.open_graph.image 
            ? unfurled.open_graph.image.url 
            : null;
          metadata.ogType = unfurled.open_graph.type;
        }
        
        if (unfurled.twitter_card) {
          metadata.twitterTitle = unfurled.twitter_card.title;
          metadata.twitterDescription = unfurled.twitter_card.description;
          metadata.twitterImage = unfurled.twitter_card.image;
          metadata.twitterCard = unfurled.twitter_card.card;
        }
        
        // Use favicon if available
        if (unfurled.favicon) {
          metadata.favicon = unfurled.favicon;
        }
      }
    } catch (unfurlError) {
      console.error('Error unfurling URL:', unfurlError);
      // Continue with basic metadata if unfurling fails
    }

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
      if (!metadata.title) {
        metadata.title = pathname.split('/').pop() || 'Untitled';
      }
    }

    // Platform-specific metadata
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      metadata.platform = 'youtube';
      metadata.type = 'video';
      
      // Extract video ID
      const videoId = domain.includes('youtu.be') 
        ? pathname.slice(1)
        : url.searchParams.get('v');
      if (videoId) {
        metadata.videoId = videoId;
        // Use hqdefault as it's the most reliably available thumbnail
        metadata.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    } else if (domain.includes('vimeo.com')) {
      metadata.platform = 'vimeo';
      metadata.type = 'video';
      
      // Extract video ID
      const videoId = pathname.split('/').pop();
      if (videoId) {
        metadata.videoId = videoId;
        try {
          const vimeoResponse = await fetch(`https://vimeo.com/api/v2/video/${videoId}.json`);
          const vimeoData = await vimeoResponse.json();
          if (vimeoData && vimeoData[0]) {
            metadata.thumbnailUrl = vimeoData[0].thumbnail_large;
            metadata.title = metadata.title || vimeoData[0].title;
            metadata.description = metadata.description || vimeoData[0].description;
          }
        } catch (error) {
          console.error('Error fetching Vimeo metadata:', error);
        }
      }
    } else if (domain.includes('spotify.com')) {
      metadata.platform = 'spotify';
      metadata.type = 'audio';
    } else if (domain.includes('soundcloud.com')) {
      metadata.platform = 'soundcloud';
      metadata.type = 'audio';
    }

    return metadata;
  } catch (error) {
    console.error('Error getting URL metadata:', error);
    return {
      type: 'url',
      url: urlString,
      createdAt: formatDate(new Date()),
      updatedAt: formatDate(new Date())
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

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

    const { url } = body;
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    // Validate URL
    if (!validateUrl(url)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid URL format' })
      };
    }

    // Connect to database
    try {
      await connectDb();
    } catch (error) {
      console.error('Database connection error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database connection failed' })
      };
    }

    // Get URL metadata
    let metadata;
    try {
      metadata = await getUrlMetadata(url);
    } catch (error) {
      console.error('Metadata extraction error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to extract URL metadata' })
      };
    }

    // Create memory document
    const memory = new Memory({
      url,
      type: metadata.type,
      status: 'pending', // Set status to pending
      metadata: {
        title: metadata.title || url,
        description: metadata.description,
        thumbnailUrl: metadata.thumbnail,
        mediaType: metadata.type,
        platform: metadata.platform,
        contentUrl: metadata.contentUrl,
        fileType: metadata.fileType,
        domain: metadata.domain,
        isSecure: metadata.isSecure,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Save to database
    try {
      await memory.save();
    } catch (error) {
      console.error('Database save error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to save to database' })
      };
    }

    // Send notification email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Send to same email for moderation
        subject: 'New URL Memory Submission for Review',
        text: `New memory submitted for review:
        
URL: ${url}
Title: ${metadata.title || 'No title'}
Description: ${metadata.description || 'No description'}
Type: ${metadata.type}
Submitted at: ${new Date().toLocaleString()}

Please review this submission at your moderation dashboard.`
      });
    } catch (error) {
      console.error('Email error:', error);
      // Continue even if email fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Memory submitted for moderation',
        memory: {
          id: memory._id,
          url,
          title: metadata.title,
          description: metadata.description,
          type: metadata.type,
          thumbnail: metadata.thumbnail,
          status: 'pending'
        }
      })
    };
  } catch (error) {
    console.error('General error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
