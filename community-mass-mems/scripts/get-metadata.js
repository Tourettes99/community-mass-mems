const fetch = require('node-fetch');
const cheerio = require('cheerio');

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

    // Try to get oEmbed data first
    try {
      const oembedResponse = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(urlString)}`);
      const oembedData = await oembedResponse.json();
      
      if (!oembedData.error) {
        metadata.title = oembedData.title;
        metadata.description = oembedData.description;
        metadata.thumbnailUrl = oembedData.thumbnail_url;
        metadata.authorName = oembedData.author_name;
        metadata.authorUrl = oembedData.author_url;
        metadata.html = oembedData.html;
        metadata.type = oembedData.type;
      }
    } catch (error) {
      console.error('Error fetching oEmbed data:', error);
    }

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
    } else {
      // For other URLs, try to fetch basic metadata
      try {
        const response = await fetch(urlString);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Get OpenGraph metadata
        metadata.title = metadata.title || $('meta[property="og:title"]').attr('content') || $('title').text();
        metadata.description = metadata.description || $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        metadata.thumbnailUrl = metadata.thumbnailUrl || $('meta[property="og:image"]').attr('content');
        metadata.type = metadata.type || $('meta[property="og:type"]').attr('content') || 'article';
        
        // Get Twitter Card metadata as fallback
        if (!metadata.thumbnailUrl) {
          metadata.thumbnailUrl = $('meta[name="twitter:image"]').attr('content');
        }
        
        // Set article-specific metadata
        if (metadata.type === 'article') {
          metadata.publishedTime = $('meta[property="article:published_time"]').attr('content');
          metadata.author = $('meta[property="article:author"]').attr('content');
        }
      } catch (error) {
        console.error('Error fetching URL metadata:', error);
      }
    }

    return metadata;
  } catch (error) {
    console.error('Error processing URL:', error);
    throw error;
  }
}

module.exports = { getUrlMetadata };
