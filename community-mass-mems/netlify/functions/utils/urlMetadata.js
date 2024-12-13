const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const ogs = require('open-graph-scraper');
const metascraper = require('metascraper')([
  require('metascraper-author')(),
  require('metascraper-date')(),
  require('metascraper-description')(),
  require('metascraper-image')(),
  require('metascraper-logo')(),
  require('metascraper-publisher')(),
  require('metascraper-title')(),
  require('metascraper-url')()
]);

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
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      embedType: 'youtube',
      embedHtml: `<iframe 
        width="100%" 
        height="100%" 
        src="https://www.youtube.com/embed/${videoId}" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen
        style="aspect-ratio: 16/9;"
      ></iframe>`
    } : null;
  },
  'youtu.be': (url) => {
    const videoId = url.pathname.slice(1);
    return videoId ? {
      platform: 'youtube',
      mediaType: 'video',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      embedType: 'youtube',
      embedHtml: `<iframe 
        width="100%" 
        height="100%" 
        src="https://www.youtube.com/embed/${videoId}" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen
        style="aspect-ratio: 16/9;"
      ></iframe>`
    } : null;
  },
  'vimeo.com': (url) => {
    const videoId = url.pathname.split('/').pop();
    return videoId ? {
      platform: 'vimeo',
      mediaType: 'video',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      embedHtml: `<iframe src="https://player.vimeo.com/video/${videoId}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
    } : null;
  },
  'twitter.com': (url) => {
    const tweetId = url.pathname.match(/status\/(\d+)/)?.[1];
    return tweetId ? {
      platform: 'twitter',
      mediaType: 'rich',
      embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`,
      embedHtml: `<blockquote class="twitter-tweet" data-dnt="true"><a href="${url.href}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`
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
      embedUrl: embedUrl.replace('reddit.com', 'redditmedia.com'),
      embedHtml: `<iframe id="reddit-embed" src="${embedUrl.replace('reddit.com', 'redditmedia.com')}" sandbox="allow-scripts allow-same-origin allow-popups" style="border: none;" height="100%" width="100%" scrolling="yes"></iframe>`
    };
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
        embedUrl: mediaType === 'video' ? urlString : undefined,
        embedHtml: mediaType === 'video' ? 
          `<video controls width="100%" height="100%"><source src="${urlString}" type="video/${extension}"></video>` :
          mediaType === 'image' ? 
          `<img src="${urlString}" alt="Image" style="max-width: 100%; height: auto;">` : undefined
      };
    }

    // First try to get metadata using metascraper
    try {
      const response = await fetch(urlString);
      const html = await response.text();
      const metadata = await metascraper({ html, url: urlString });
      
      return {
        title: metadata.title,
        description: metadata.description,
        previewUrl: metadata.image,
        mediaType: 'article',
        siteName: metadata.publisher || url.hostname,
        author: metadata.author,
        publishedDate: metadata.date,
        embedHtml: `<div style="max-width: 100%; padding: 16px; border: 1px solid #ddd; border-radius: 8px;">
          ${metadata.image ? `<img src="${metadata.image}" style="max-width: 100%; height: auto; margin-bottom: 16px;">` : ''}
          <h3 style="margin: 0 0 8px 0;">${metadata.title || ''}</h3>
          <p style="margin: 0 0 8px 0; color: #666;">${metadata.description || ''}</p>
          <small style="color: #999;">${metadata.publisher || url.hostname}</small>
        </div>`
      };
    } catch (error) {
      console.warn('Failed to get metadata with metascraper:', error);
    }

    // Then try open-graph-scraper as fallback
    try {
      const { result } = await ogs({ url: urlString });
      if (result) {
        return {
          title: result.ogTitle || result.twitterTitle,
          description: result.ogDescription || result.twitterDescription,
          previewUrl: result.ogImage?.[0]?.url || result.twitterImage,
          mediaType: result.ogType === 'article' ? 'article' : 'rich',
          siteName: result.ogSiteName || url.hostname,
          author: result.author,
          publishedDate: result.articlePublishedTime,
          favicon: result.favicon,
          embedHtml: result.ogType === 'article' ? 
            `<div style="max-width: 100%; padding: 16px; border: 1px solid #ddd; border-radius: 8px;">
              ${result.ogImage?.[0]?.url ? `<img src="${result.ogImage[0].url}" style="max-width: 100%; height: auto; margin-bottom: 16px;">` : ''}
              <h3 style="margin: 0 0 8px 0;">${result.ogTitle || ''}</h3>
              <p style="margin: 0 0 8px 0; color: #666;">${result.ogDescription || ''}</p>
              <small style="color: #999;">${result.ogSiteName || url.hostname}</small>
            </div>` : undefined
        };
      }
    } catch (error) {
      console.warn('Failed to get metadata with open-graph-scraper:', error);
    }

    // Fallback to basic fetch and HTML parsing
    const response = await fetch(urlString);
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Get OpenGraph and Twitter Card data
    const metadata = {
      title: doc.querySelector('meta[property="og:title"]')?.content || 
             doc.querySelector('meta[name="twitter:title"]')?.content || 
             doc.title,
      description: doc.querySelector('meta[property="og:description"]')?.content || 
                  doc.querySelector('meta[name="twitter:description"]')?.content || 
                  doc.querySelector('meta[name="description"]')?.content,
      previewUrl: doc.querySelector('meta[property="og:image"]')?.content || 
                 doc.querySelector('meta[name="twitter:image"]')?.content,
      mediaType: doc.querySelector('meta[property="og:type"]')?.content === 'article' ? 'article' : 'rich',
      siteName: doc.querySelector('meta[property="og:site_name"]')?.content || url.hostname,
      author: doc.querySelector('meta[property="article:author"]')?.content,
      publishedDate: doc.querySelector('meta[property="article:published_time"]')?.content,
      favicon: doc.querySelector('link[rel*="icon"]')?.href
    };

    // Generate embed HTML for articles
    if (metadata.mediaType === 'article') {
      metadata.embedHtml = `<div style="max-width: 100%; padding: 16px; border: 1px solid #ddd; border-radius: 8px;">
        ${metadata.previewUrl ? `<img src="${metadata.previewUrl}" style="max-width: 100%; height: auto; margin-bottom: 16px;">` : ''}
        <h3 style="margin: 0 0 8px 0;">${metadata.title || ''}</h3>
        <p style="margin: 0 0 8px 0; color: #666;">${metadata.description || ''}</p>
        <small style="color: #999;">${metadata.siteName}</small>
      </div>`;
    }

    return metadata;
  } catch (error) {
    console.error('Error extracting meta tags:', error);
    return {
      title: new URL(urlString).pathname.split('/').pop() || urlString,
      description: `Failed to extract metadata: ${error.message}`,
      mediaType: 'rich'
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
  return getMediaTypeFromExtension(extension);
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
      description: `Failed to process URL: ${error.message}`,
      mediaType: 'rich'
    };
  }
}

// Helper function to handle Discord CDN URLs
async function handleDiscordCdn(urlString) {
  try {
    const url = new URL(urlString);
    const extension = url.pathname.split('.').pop()?.toLowerCase();
    const mediaType = getMediaTypeFromExtension(extension);
    
    return {
      title: url.pathname.split('/').pop() || urlString,
      description: `Discord ${mediaType.toUpperCase()} file`,
      mediaType,
      previewUrl: urlString,
      siteName: 'Discord',
      embedUrl: mediaType === 'video' ? urlString : undefined,
      embedHtml: mediaType === 'video' ? 
        `<video controls width="100%" height="100%"><source src="${urlString}" type="video/${extension}"></video>` :
        mediaType === 'image' ? 
        `<img src="${urlString}" alt="Discord Image" style="max-width: 100%; height: auto;">` : undefined
    };
  } catch (error) {
    console.error('Error handling Discord CDN URL:', error);
    return {
      error: error.message,
      mediaType: 'rich'
    };
  }
}

module.exports = {
  getUrlMetadata,
  extractMetaTags,
  getMediaTypeFromContentType,
  getMediaTypeFromExtension,
  detectDiscordMediaType,
  handleDiscordCdn
};
