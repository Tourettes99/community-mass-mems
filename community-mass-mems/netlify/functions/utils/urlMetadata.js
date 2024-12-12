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
    const response = await fetch(urlString);
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
    return {};
  }
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
      metadata.metaTags = {};
      
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
    
    // For all other URLs, fetch meta tags
    else {
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
}

module.exports = {
  getUrlMetadata,
  extractMetaTags
};
