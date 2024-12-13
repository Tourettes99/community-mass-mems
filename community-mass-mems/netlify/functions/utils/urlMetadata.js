const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

// Media file extensions
const MEDIA_EXTENSIONS = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif'],
  videos: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'm4v', 'mkv', '3gp'],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma', 'aiff'],
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'md', 'json']
};

// Platform specific handlers
const PLATFORM_HANDLERS = {
  'youtube.com': (url) => {
    const videoId = url.searchParams.get('v');
    return videoId ? {
      platform: 'youtube',
      mediaType: 'video',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    } : null;
  },
  'youtu.be': (url) => {
    const videoId = url.pathname.slice(1);
    return videoId ? {
      platform: 'youtube',
      mediaType: 'video',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    } : null;
  },
  'vimeo.com': (url) => {
    const videoId = url.pathname.split('/').pop();
    return videoId ? {
      platform: 'vimeo',
      mediaType: 'video',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`
    } : null;
  },
  'twitter.com': (url) => {
    const tweetId = url.pathname.match(/status\/(\d+)/)?.[1];
    return tweetId ? {
      platform: 'twitter',
      mediaType: 'rich',
      embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`
    } : null;
  },
  'x.com': (url) => PLATFORM_HANDLERS['twitter.com'](url),
  'reddit.com': (url) => {
    const isPost = url.pathname.includes('/comments/');
    const embedUrl = isPost
      ? `https://www.redditmedia.com${url.pathname}?ref_source=embed&ref=share&embed=true`
      : `${url.href}?ref_source=embed&ref=share&embed=true`;
    return {
      platform: 'reddit',
      mediaType: 'rich',
      embedUrl: embedUrl.replace('reddit.com', 'redditmedia.com')
    };
  },
  'instagram.com': (url) => {
    const match = url.pathname.match(/\/(p|reel|tv)\/([^\/\?]+)/);
    return match ? {
      platform: 'instagram',
      mediaType: 'rich',
      embedUrl: `https://www.instagram.com/p/${match[2]}/embed/`
    } : null;
  },
  'tiktok.com': (url) => {
    const videoId = url.pathname.split('/').pop()?.split('?')[0];
    return videoId ? {
      platform: 'tiktok',
      mediaType: 'rich',
      embedUrl: `https://www.tiktok.com/embed/${videoId}`
    } : null;
  },
  'discord.com': (url) => {
    const messageMatch = url.pathname.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
    const inviteMatch = url.pathname.match(/invite\/([a-zA-Z0-9-]+)/);
    if (messageMatch) {
      return {
        platform: 'discord',
        mediaType: 'rich',
        embedUrl: `https://discord.com/embed?messageId=${messageMatch[3]}&channelId=${messageMatch[2]}&guildId=${messageMatch[1]}`
      };
    }
    if (inviteMatch) {
      return {
        platform: 'discord',
        mediaType: 'rich',
        embedUrl: `https://discord.com/widget?id=${inviteMatch[1]}&theme=dark`
      };
    }
    return null;
  }
};

// Extract meta tags from HTML
async function extractMetaTags(urlString) {
  try {
    const url = new URL(urlString);
    const extension = url.pathname.split('.').pop()?.toLowerCase();
    const isDiscordCdn = url.hostname.includes('cdn.discordapp.com') || url.hostname.includes('media.discordapp.net');
    
    // Handle media files and Discord CDN
    if (isDiscordCdn || Object.values(MEDIA_EXTENSIONS).flat().includes(extension)) {
      const mediaType = isDiscordCdn ? detectDiscordMediaType(urlString) : getMediaTypeFromExtension(extension);
      return {
        title: url.pathname.split('/').pop() || urlString,
        description: `${isDiscordCdn ? 'Discord' : ''} ${mediaType.toUpperCase()} file`,
        mediaType,
        previewUrl: urlString,
        siteName: isDiscordCdn ? 'Discord' : url.hostname,
        embedUrl: mediaType === 'video' ? urlString : undefined
      };
    }

    // Check if URL is accessible
    const response = await fetch(urlString, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      const mediaType = getMediaTypeFromContentType(contentType);
      return {
        title: url.pathname.split('/').pop() || urlString,
        description: `File type: ${contentType || 'unknown'}`,
        mediaType,
        previewUrl: urlString,
        siteName: url.hostname,
        embedUrl: mediaType === 'video' ? urlString : undefined
      };
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Get all meta tags
    const metaTags = {};
    doc.querySelectorAll('meta').forEach(tag => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (name && content) {
        metaTags[name.toLowerCase()] = content;
      }
    });

    // Get OpenGraph data
    const ogData = {
      title: metaTags['og:title'],
      description: metaTags['og:description'],
      image: metaTags['og:image'],
      type: metaTags['og:type'],
      site_name: metaTags['og:site_name']
    };

    // Get Twitter Card data
    const twitterData = {
      title: metaTags['twitter:title'],
      description: metaTags['twitter:description'],
      image: metaTags['twitter:image'],
      card: metaTags['twitter:card']
    };

    return {
      title: ogData.title || twitterData.title || doc.title || '',
      description: ogData.description || twitterData.description || metaTags.description || '',
      previewUrl: ogData.image || twitterData.image || '',
      mediaType: ogData.type === 'video' ? 'video' : 'rich',
      siteName: ogData.site_name || url.hostname,
      favicon: doc.querySelector('link[rel*="icon"]')?.href
    };
  } catch (error) {
    console.error('Error extracting meta tags:', error);
    return {
      title: new URL(urlString).pathname.split('/').pop() || urlString,
      description: `Failed to extract metadata: ${error.message}`
    };
  }
}

// Helper function to detect media type from content type
function getMediaTypeFromContentType(contentType) {
  if (!contentType) return 'rich';
  
  if (contentType.includes('image/')) return 'image';
  if (contentType.includes('video/')) return 'video';
  if (contentType.includes('audio/')) return 'audio';
  
  return 'rich';
}

// Helper function to detect media type from file extension
function getMediaTypeFromExtension(extension) {
  if (!extension) return 'rich';
  
  if (MEDIA_EXTENSIONS.images.includes(extension)) return 'image';
  if (MEDIA_EXTENSIONS.videos.includes(extension)) return 'video';
  if (MEDIA_EXTENSIONS.audio.includes(extension)) return 'audio';
  if (MEDIA_EXTENSIONS.documents.includes(extension)) return 'document';
  
  return 'rich';
}

// Helper function to detect Discord media type
function detectDiscordMediaType(url) {
  const extension = url.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
    return 'image';
  } else if (['mp4', 'webm', 'mov'].includes(extension)) {
    return 'video';
  } else if (['mp3', 'ogg', 'wav'].includes(extension)) {
    return 'audio';
  }
  
  return 'rich';
}

// Get URL metadata including meta tags
async function getUrlMetadata(urlString) {
  try {
    const url = new URL(urlString);
    const domain = url.hostname.replace('www.', '');
    
    // Basic metadata
    let metadata = {
      url: urlString,
      domain,
      type: 'url',
      isSecure: url.protocol === 'https:',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Check for platform-specific handler
    const platformHandler = PLATFORM_HANDLERS[domain];
    if (platformHandler) {
      const platformData = platformHandler(url);
      if (platformData) {
        metadata = { ...metadata, ...platformData };
      }
    }

    // Handle Discord CDN
    if (domain.includes('cdn.discordapp.com') || domain.includes('media.discordapp.net')) {
      const discordData = await handleDiscordCdn(urlString);
      metadata = { ...metadata, ...discordData };
    }
    // For all other URLs
    else if (!metadata.mediaType) {
      const metaTags = await extractMetaTags(urlString);
      metadata = { ...metadata, ...metaTags };
    }

    return metadata;
  } catch (error) {
    console.error('Error getting URL metadata:', error);
    return {
      url: urlString,
      type: 'url',
      error: error.message,
      title: urlString,
      description: `Failed to process URL: ${error.message}`
    };
  }
}

// Helper function to handle Discord CDN URLs
async function handleDiscordCdn(urlString) {
  const url = new URL(urlString);
  const extension = url.pathname.split('.').pop()?.toLowerCase();
  
  const metadata = {
    platform: 'discord',
    title: url.pathname.split('/').pop() || urlString,
    description: 'Discord CDN File',
    isDiscordCdn: true
  };

  if (extension) {
    metadata.mediaType = detectDiscordMediaType(urlString);
    if (metadata.mediaType === 'video') {
      metadata.embedUrl = urlString;
    }
  }

  // Check if file exists and get expiration info
  try {
    const response = await fetch(urlString, { method: 'HEAD' });
    if (!response.ok) {
      metadata.error = `File not accessible: ${response.status} ${response.statusText}`;
      metadata.isExpired = true;
    }

    const exParam = url.searchParams.get('ex');
    if (exParam) {
      try {
        metadata.expiresAt = new Date(parseInt(exParam, 16) * 1000).toISOString();
      } catch (error) {
        console.error('Error parsing Discord expiration:', error);
      }
    }
  } catch (error) {
    metadata.error = `Failed to access file: ${error.message}`;
    metadata.isExpired = true;
  }

  return metadata;
}

module.exports = {
  getUrlMetadata,
  extractMetaTags,
  getMediaTypeFromContentType,
  getMediaTypeFromExtension,
  detectDiscordMediaType
};
