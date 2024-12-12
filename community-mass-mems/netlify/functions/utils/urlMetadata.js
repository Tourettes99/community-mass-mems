const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

// Media file extensions
const MEDIA_EXTENSIONS = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif'],
  videos: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'm4v', 'mkv', '3gp'],
  audio: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma', 'aiff'],
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'md', 'json']
};

// Extract meta tags from HTML
async function extractMetaTags(urlString) {
  try {
    // Don't try to extract meta tags from media files or Discord CDN
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
        embedHtml: mediaType === 'video' ? `<video controls src="${urlString}"></video>` :
                  mediaType === 'audio' ? `<audio controls src="${urlString}"></audio>` : ''
      };
    }

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
        embedHtml: mediaType === 'video' ? `<video controls src="${urlString}"></video>` :
                  mediaType === 'audio' ? `<audio controls src="${urlString}"></audio>` : ''
      };
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Get all meta tags
    const metaTags = {};
    const tags = doc.querySelectorAll('meta');
    tags.forEach(tag => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (name && content) {
        metaTags[name.toLowerCase()] = content;
      }
    });

    // Get title
    metaTags.title = doc.querySelector('title')?.textContent || '';

    // Get description from meta description or first paragraph
    if (!metaTags.description) {
      metaTags.description = doc.querySelector('p')?.textContent || '';
    }

    // Get main content text
    const bodyText = doc.body.textContent.replace(/\s+/g, ' ').trim();
    metaTags.content = bodyText.slice(0, 1000); // First 1000 characters

    return metaTags;
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
  if (!url) return 'rich';
  
  const extension = url.split('.').pop()?.toLowerCase();
  if (!extension) return 'rich';

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
      metadata.title = url.pathname.split('/').pop() || urlString;
      metadata.description = 'Discord CDN File';
      
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
          try {
            metadata.expiresAt = new Date(parseInt(exParam, 16) * 1000).toISOString();
          } catch (error) {
            console.error('Error parsing Discord expiration:', error);
          }
        }

        // Check if file exists by doing a HEAD request
        try {
          const response = await fetch(urlString, { method: 'HEAD' });
          if (!response.ok) {
            metadata.error = `File not accessible: ${response.status} ${response.statusText}`;
            metadata.isExpired = true;
          }
        } catch (error) {
          metadata.error = `Failed to access file: ${error.message}`;
          metadata.isExpired = true;
        }
      }

      return metadata;
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
          metadata.error = `Failed to fetch YouTube metadata: ${error.message}`;
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
          metadata.error = `Failed to fetch Vimeo metadata: ${error.message}`;
        }
      }
    }
    
    // For all other URLs, fetch meta tags
    else {
      try {
        const metaTags = await extractMetaTags(urlString);
        metadata.metaTags = metaTags;
        metadata.title = metaTags.title || metadata.title;
        metadata.description = metaTags.description || metadata.description;
        
        // Set content rating if available
        if (metaTags['rating'] || metaTags['content-rating']) {
          metadata.contentRating = metaTags['rating'] || metaTags['content-rating'];
        }
        
        // Set age restriction if available
        if (metaTags['age-rating'] || metaTags['age-restriction']) {
          metadata.ageRating = metaTags['age-rating'] || metaTags['age-restriction'];
        }
      } catch (error) {
        console.error('Error fetching meta tags:', error);
        metadata.error = `Failed to fetch meta tags: ${error.message}`;
      }
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

module.exports = {
  getUrlMetadata,
  extractMetaTags,
  getMediaTypeFromContentType,
  getMediaTypeFromExtension,
  detectDiscordMediaType
};
