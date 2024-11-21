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
    raw: mongoose.Schema.Types.Mixed
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

// Function to check if URL is an image
const isImageUrl = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    return contentType.startsWith('image/');
  } catch (error) {
    console.error('Error checking image URL:', error);
    return false;
  }
};

// Function to determine media type and preview
const getMediaInfo = async (url, metadata) => {
  // Image extensions
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  // Video extensions
  const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
  // Audio extensions
  const audioExts = ['.mp3', '.wav', '.ogg', '.m4a'];

  const urlObj = new URL(url);
  const path = urlObj.pathname.toLowerCase();
  const hostname = urlObj.hostname.toLowerCase();

  let mediaType = 'url';
  let previewType = 'none';
  let previewUrl = null;
  let playbackHtml = null;
  let isPlayable = false;

  // First check if it's a direct image URL
  const isImage = await isImageUrl(url);
  if (isImage || imageExts.some(ext => path.endsWith(ext))) {
    mediaType = 'image';
    previewType = 'image';
    previewUrl = url;
    playbackHtml = `<img src="${url}" alt="Direct image" style="max-width: 100%; height: auto;">`;
    isPlayable = true;
  } else if (videoExts.some(ext => path.endsWith(ext))) {
    mediaType = 'video';
    previewType = 'video';
    previewUrl = url;
    playbackHtml = `<video controls style="max-width: 100%;"><source src="${url}" type="video/${path.split('.').pop()}">Your browser does not support the video tag.</video>`;
    isPlayable = true;
  } else if (audioExts.some(ext => path.endsWith(ext))) {
    mediaType = 'audio';
    previewType = 'audio';
    previewUrl = url;
    playbackHtml = `<audio controls><source src="${url}" type="audio/${path.split('.').pop()}">Your browser does not support the audio tag.</audio>`;
    isPlayable = true;
  }

  // Check for special platforms
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    mediaType = 'video';
    previewType = 'youtube';
    const videoId = getVideoId(url).videoId;
    previewUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    playbackHtml = generateEmbedHtml(url, 'youtube', videoId);
    isPlayable = true;
  } else if (hostname.includes('vimeo.com')) {
    mediaType = 'video';
    previewType = 'vimeo';
    const videoId = getVideoId(url).videoId;
    previewUrl = metadata?.ogImage;
    playbackHtml = generateEmbedHtml(url, 'vimeo', videoId);
    isPlayable = true;
  } else if (hostname.includes('spotify.com')) {
    mediaType = 'audio';
    previewType = 'spotify';
    previewUrl = metadata?.ogImage;
    playbackHtml = generateEmbedHtml(url, 'spotify');
    isPlayable = true;
  } else if (hostname.includes('soundcloud.com')) {
    mediaType = 'audio';
    previewType = 'soundcloud';
    previewUrl = metadata?.ogImage;
    playbackHtml = generateEmbedHtml(url, 'soundcloud');
    isPlayable = true;
  } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    mediaType = 'social';
    previewType = 'twitter';
    previewUrl = metadata?.twitterImage || metadata?.ogImage;
    playbackHtml = generateEmbedHtml(url, 'twitter');
    isPlayable = true;
  } else if (hostname.includes('instagram.com')) {
    mediaType = 'social';
    previewType = 'instagram';
    previewUrl = metadata?.ogImage;
    playbackHtml = generateEmbedHtml(url, 'instagram');
    isPlayable = true;
  }

  // If no specific preview was found but we have OG image, use it
  if (!previewUrl && metadata?.ogImage) {
    previewUrl = metadata.ogImage;
    if (!previewType || previewType === 'none') {
      previewType = 'image';
      isPlayable = true;
    }
  }

  // If still no preview but we have Twitter image, use it
  if (!previewUrl && metadata?.twitterImage) {
    previewUrl = metadata.twitterImage;
    if (!previewType || previewType === 'none') {
      previewType = 'image';
      isPlayable = true;
    }
  }

  // For URLs that we couldn't determine a preview for, try to fetch OpenGraph data
  if (!previewUrl && !playbackHtml) {
    try {
      const ogData = await unfurl(url);
      if (ogData.open_graph?.image?.url) {
        previewUrl = ogData.open_graph.image.url;
        previewType = 'image';
        isPlayable = true;
      }
    } catch (error) {
      console.error('Error fetching OpenGraph data:', error);
    }
  }

  return {
    mediaType,
    previewType,
    previewUrl,
    playbackHtml,
    isPlayable
  };
};

// Function to generate embed HTML
const generateEmbedHtml = (url, platform, videoId) => {
  switch (platform) {
    case 'youtube':
      return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="max-width: 100%;"></iframe>`;
    case 'vimeo':
      return `<iframe src="https://player.vimeo.com/video/${videoId}" width="560" height="315" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="max-width: 100%;"></iframe>`;
    case 'twitter':
      return `<blockquote class="twitter-tweet" data-dnt="true" data-theme="light"><a href="${url}"></a></blockquote>`;
    case 'spotify':
      const spotifyMatch = url.match(/spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/);
      if (spotifyMatch) {
        const [, type, id] = spotifyMatch;
        const height = type === 'track' ? 152 : type === 'episode' ? 232 : 380;
        return `<iframe src="https://open.spotify.com/embed/${type}/${id}" width="100%" height="${height}" frameborder="0" allowtransparency="true" allow="encrypted-media" style="max-width: 100%;"></iframe>`;
      }
      return null;
    case 'soundcloud':
      return `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>`;
    case 'instagram':
      const instagramMatch = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
      if (instagramMatch) {
        const postId = instagramMatch[1];
        return `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/p/${postId}/" style="max-width:540px; min-width:326px; margin: 0 auto;"><a href="https://www.instagram.com/p/${postId}/" target="_blank">View on Instagram</a></blockquote>`;
      }
      return null;
    case 'facebook':
      const fbMatch = url.match(/facebook\.com\/([^\/]+)\/(?:posts|videos)\/(\d+)/);
      if (fbMatch) {
        return `<div class="fb-post" data-href="${url}" data-width="500" data-show-text="true"></div>`;
      }
      return null;
    case 'tiktok':
      const tiktokMatch = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/);
      if (tiktokMatch) {
        const videoId = tiktokMatch[1];
        return `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}" style="max-width: 605px;min-width: 325px;"><section></section></blockquote>`;
      }
      return null;
    case 'reddit':
      return `<iframe id="reddit-embed" src="https://www.redditmedia.com/r/${encodeURIComponent(url)}?ref_source=embed&amp;ref=share&amp;embed=true" sandbox="allow-scripts allow-same-origin allow-popups" style="border: none;" height="400" width="100%" scrolling="yes"></iframe>`;
    case 'pinterest':
      return `<a data-pin-do="embedPin" href="${url}"></a>`;
    case 'general':
      // For general HTML5 video/audio files
      const ext = url.split('.').pop().toLowerCase();
      if (['mp4', 'webm', 'ogg'].includes(ext)) {
        return `<video controls playsinline style="max-width: 100%;"><source src="${url}" type="video/${ext}">Your browser does not support the video tag.</video>`;
      } else if (['mp3', 'wav'].includes(ext)) {
        return `<audio controls style="width: 100%;"><source src="${url}" type="audio/${ext}">Your browser does not support the audio tag.</audio>`;
      }
      return null;
    default:
      return null;
  }
};

// Function to fetch URL metadata
const fetchUrlMetadata = async (url, userMetadata = {}) => {
  try {
    const result = await unfurl(url, {
      follow: 5,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CommunityMassMems/1.0; +https://communitymems.example.com)'
      }
    });
    
    // Get media info after we have metadata
    const mediaInfo = await getMediaInfo(url, {
      ogImage: result.open_graph?.image?.url,
      twitterImage: result.twitter_card?.image?.url
    });

    // Determine content type from metadata or user input
    let contentType = userMetadata.type || result.open_graph?.type || 'website';
    if (result.open_graph?.video) contentType = 'video';
    else if (result.open_graph?.audio) contentType = 'audio';
    else if (result.twitter_card?.card === 'player') contentType = 'media';

    return {
      // Basic metadata - prioritize user input
      title: userMetadata.title || result.title || result.open_graph?.title || result.twitter_card?.title,
      description: userMetadata.description || result.description || result.open_graph?.description || result.twitter_card?.description,
      siteName: userMetadata.siteName || result.site_name || result.open_graph?.site_name || new URL(url).hostname,
      contentType: userMetadata.type || contentType,
      
      // User-provided content takes precedence
      content: userMetadata.content,
      tags: userMetadata.tags || [],
      
      // Open Graph metadata
      ogTitle: result.open_graph?.title,
      ogDescription: result.open_graph?.description,
      ogImage: result.open_graph?.image?.url,
      ogType: result.open_graph?.type,
      ogUrl: result.open_graph?.url,
      ogAudio: result.open_graph?.audio?.url,
      ogVideo: result.open_graph?.video?.url,
      
      // Twitter Card metadata
      twitterCard: result.twitter_card?.card,
      twitterTitle: result.twitter_card?.title,
      twitterDescription: result.twitter_card?.description,
      twitterImage: result.twitter_card?.image?.url,
      twitterCreator: result.twitter_card?.creator,
      twitterPlayer: result.twitter_card?.player?.url,
      
      // Article metadata
      articleSection: userMetadata.section || result.open_graph?.article?.section,
      articleTags: userMetadata.tags || result.open_graph?.article?.tags || [],
      articlePublisher: result.open_graph?.article?.publisher,
      
      // Media and preview information
      ...mediaInfo,
      
      // Additional metadata
      language: userMetadata.language || result.language,
      publishedDate: userMetadata.publishedDate || result.open_graph?.article?.published_time || result.published,
      modifiedDate: userMetadata.modifiedDate || result.open_graph?.article?.modified_time || result.modified,
      author: userMetadata.author || result.open_graph?.article?.author || result.author,
      favicon: result.favicon,
      
      // Structured data
      structuredData: result.json_ld || [],
      
      // Additional media metadata
      duration: result.open_graph?.video?.duration || result.twitter_card?.player?.duration,
      width: result.open_graph?.video?.width || result.twitter_card?.player?.width,
      height: result.open_graph?.video?.height || result.twitter_card?.player?.height,
      
      // Raw metadata for debugging
      raw: {
        openGraph: result.open_graph,
        twitterCard: result.twitter_card,
        jsonLd: result.json_ld,
        userProvided: userMetadata
      }
    };
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    // Return user metadata even if URL fetch fails
    return {
      ...userMetadata,
      siteName: userMetadata.siteName || new URL(url).hostname,
      error: 'Failed to fetch URL metadata'
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
    
    // Get media info including preview and playback HTML
    const mediaInfo = await getMediaInfo(url, urlMetadata);
    
    const memoryData = {
      type: type || mediaInfo.mediaType || 'url',
      url: url,
      metadata: {
        ...urlMetadata,
        ...mediaInfo
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
