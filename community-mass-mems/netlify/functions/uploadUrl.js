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
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif'],
  videos: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'm4v', 'mkv', '3gp'],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma', 'aiff'],
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'md', 'json']
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

    // Check if it's a direct file link first
    if (extension && Object.values(MEDIA_EXTENSIONS).flat().includes(extension)) {
      metadata.type = Object.keys(MEDIA_EXTENSIONS).find(type => 
        MEDIA_EXTENSIONS[type].includes(extension)
      ).slice(0, -1); // Remove 's' from end (images -> image)
      metadata.mediaType = metadata.type;
      metadata.fileType = extension;
      metadata.contentUrl = urlString;
      metadata.title = decodeURIComponent(pathname.split('/').pop());
      metadata.isDirectFile = true;

      // For images, use the URL as the thumbnail
      if (metadata.type === 'image') {
        metadata.thumbnailUrl = urlString;
      }

      // Try to get file size and MIME type
      try {
        const response = await fetch(urlString, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        
        if (contentType) metadata.mimeType = contentType;
        if (contentLength) metadata.fileSize = parseInt(contentLength);
      } catch (error) {
        console.error('Error getting file metadata:', error);
      }
    }

    // Try to fetch rich metadata for all URLs (even direct files might have OpenGraph data)
    try {
      const unfurled = await unfurl(urlString);
      
      if (unfurled) {
        // Basic metadata
        if (!metadata.title) metadata.title = unfurled.title;
        if (!metadata.description) metadata.description = unfurled.description;
        
        // OpenGraph metadata
        if (unfurled.open_graph) {
          const og = unfurled.open_graph;
          metadata.ogTitle = og.title;
          metadata.ogDescription = og.description;
          metadata.ogType = og.type;
          
          if (og.image) {
            metadata.ogImage = typeof og.image === 'string' ? og.image : og.image.url;
            if (og.image.width) metadata.ogImageWidth = og.image.width;
            if (og.image.height) metadata.ogImageHeight = og.image.height;
            if (og.image.type) metadata.ogImageType = og.image.type;
          }

          if (og.video) {
            metadata.ogVideo = typeof og.video === 'string' ? og.video : og.video.url;
            if (og.video.width) metadata.ogVideoWidth = og.video.width;
            if (og.video.height) metadata.ogVideoHeight = og.video.height;
            if (og.video.type) metadata.ogVideoType = og.video.type;
          }

          if (og.audio) {
            metadata.ogAudio = typeof og.audio === 'string' ? og.audio : og.audio.url;
            if (og.audio.type) metadata.ogAudioType = og.audio.type;
          }
        }
        
        // Twitter Card metadata
        if (unfurled.twitter_card) {
          const twitter = unfurled.twitter_card;
          metadata.twitterTitle = twitter.title;
          metadata.twitterDescription = twitter.description;
          metadata.twitterImage = twitter.image;
          metadata.twitterCard = twitter.card;
          if (twitter.player) {
            metadata.twitterPlayer = twitter.player;
            metadata.twitterPlayerWidth = twitter.player_width;
            metadata.twitterPlayerHeight = twitter.player_height;
          }
        }
        
        // Oembed metadata
        if (unfurled.oEmbed) {
          const oembed = unfurled.oEmbed;
          metadata.oembedType = oembed.type;
          metadata.oembedTitle = oembed.title;
          metadata.oembedAuthor = oembed.author_name;
          metadata.oembedProvider = oembed.provider_name;
          metadata.oembedThumbnail = oembed.thumbnail_url;
          metadata.oembedWidth = oembed.width;
          metadata.oembedHeight = oembed.height;
          metadata.oembedHtml = oembed.html;
        }
        
        // Favicon and icons
        if (unfurled.favicon) {
          metadata.favicon = unfurled.favicon;
        }
        if (unfurled.icons && unfurled.icons.length > 0) {
          metadata.icons = unfurled.icons.map(icon => ({
            url: icon.url,
            type: icon.type,
            size: icon.sizes
          }));
        }
      }
    } catch (unfurlError) {
      console.error('Error unfurling URL:', unfurlError);
      // Continue with basic metadata if unfurling fails
    }

    // Platform-specific metadata
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      metadata.platform = 'youtube';
      metadata.type = 'video';
      metadata.mediaType = 'video';
      
      const videoId = domain.includes('youtu.be') 
        ? pathname.slice(1)
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
    } else if (domain.includes('vimeo.com')) {
      metadata.platform = 'vimeo';
      metadata.type = 'video';
      metadata.mediaType = 'video';
      
      const videoId = pathname.split('/').pop();
      if (videoId) {
        metadata.videoId = videoId;
        metadata.embedUrl = `https://player.vimeo.com/video/${videoId}`;
        try {
          const vimeoResponse = await fetch(`https://vimeo.com/api/v2/video/${videoId}.json`);
          const vimeoData = await vimeoResponse.json();
          if (vimeoData && vimeoData[0]) {
            metadata.thumbnailUrl = vimeoData[0].thumbnail_large;
            if (!metadata.title) metadata.title = vimeoData[0].title;
            if (!metadata.description) metadata.description = vimeoData[0].description;
            metadata.author = vimeoData[0].user_name;
            metadata.authorUrl = vimeoData[0].user_url;
            metadata.duration = vimeoData[0].duration;
            metadata.width = vimeoData[0].width;
            metadata.height = vimeoData[0].height;
          }
        } catch (error) {
          console.error('Error fetching Vimeo metadata:', error);
        }
      }
    } else if (domain.includes('spotify.com')) {
      metadata.platform = 'spotify';
      metadata.type = 'audio';
      metadata.mediaType = 'audio';
      // Extract Spotify URI for embedding
      const spotifyPath = pathname.split('/');
      if (spotifyPath.length >= 3) {
        const type = spotifyPath[1]; // track, album, playlist
        const id = spotifyPath[2];
        metadata.spotifyType = type;
        metadata.spotifyId = id;
        metadata.embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
      }
    } else if (domain.includes('soundcloud.com')) {
      metadata.platform = 'soundcloud';
      metadata.type = 'audio';
      metadata.mediaType = 'audio';
    } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
      metadata.platform = 'twitter';
      metadata.type = 'social';
      const tweetPath = pathname.split('/');
      if (tweetPath.length >= 4 && tweetPath[2] === 'status') {
        metadata.tweetId = tweetPath[3];
      }
    } else if (domain.includes('instagram.com')) {
      metadata.platform = 'instagram';
      metadata.type = 'social';
      if (pathname.includes('/p/')) {
        metadata.postId = pathname.split('/p/')[1].split('/')[0];
      }
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
        ...metadata, // Include all metadata fields
        title: metadata.title || url,
        description: metadata.description,
        thumbnailUrl: metadata.thumbnailUrl,
        mediaType: metadata.mediaType,
        platform: metadata.platform,
        contentUrl: metadata.contentUrl,
        fileType: metadata.fileType,
        domain: metadata.domain,
        isSecure: metadata.isSecure,
        videoId: metadata.videoId,
        ogTitle: metadata.ogTitle,
        ogDescription: metadata.ogDescription,
        ogImage: metadata.ogImage,
        ogType: metadata.ogType,
        twitterTitle: metadata.twitterTitle,
        twitterDescription: metadata.twitterDescription,
        twitterImage: metadata.twitterImage,
        twitterCard: metadata.twitterCard,
        favicon: metadata.favicon
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
        to: process.env.EMAIL_USER,
        subject: 'New URL Memory Submission for Review',
        text: `New memory submitted for review:

URL: ${url}
Title: ${metadata.title || 'No title'}
Description: ${metadata.description || 'No description'}
Type: ${metadata.type}
Memory ID: ${memory._id}
Submitted at: ${new Date().toLocaleString()}

To moderate this submission:

1. Open terminal in the project directory
2. Run one of these commands:

To approve:
node scripts/moderate.js moderate ${memory._id} approve

To reject:
node scripts/moderate.js moderate ${memory._id} reject

To list all pending submissions:
node scripts/moderate.js list`,
        html: `
          <h2>New memory submitted for review</h2>
          <p><strong>URL:</strong> ${url}</p>
          <p><strong>Title:</strong> ${metadata.title || 'No title'}</p>
          <p><strong>Description:</strong> ${metadata.description || 'No description'}</p>
          <p><strong>Type:</strong> ${metadata.type}</p>
          <p><strong>Memory ID:</strong> <code>${memory._id}</code></p>
          <p><strong>Submitted at:</strong> ${new Date().toLocaleString()}</p>
          <div style="margin-top: 20px; background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
            <h3>Moderation Instructions:</h3>
            <p>1. Open terminal in the project directory</p>
            <p>2. Run one of these commands:</p>
            <pre style="background-color: #2d2d2d; color: #ffffff; padding: 10px; border-radius: 3px;">
# To approve:
node scripts/moderate.js moderate ${memory._id} approve

# To reject:
node scripts/moderate.js moderate ${memory._id} reject

# To list all pending submissions:
node scripts/moderate.js list</pre>
          </div>
        `
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
