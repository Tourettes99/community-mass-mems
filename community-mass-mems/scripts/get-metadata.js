const fetch = require('node-fetch');

async function getUrlMetadata(urlString) {
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
}

module.exports = { getUrlMetadata };
