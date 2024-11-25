const { unfurl } = require('unfurl.js');
const fileType = require('file-type');
const { getMetadata } = require('page-metadata-parser');
const domino = require('domino');
const fetch = require('node-fetch');

async function isImageUrl(url) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const urlLower = url.toLowerCase();
  return imageExtensions.some(ext => urlLower.endsWith(ext));
}

async function extractUrlMetadata(url) {
  try {
    // Check if it's a direct image URL
    if (await isImageUrl(url)) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      
      const buffer = await response.buffer();
      const type = await fileType.fromBuffer(buffer);
      
      return {
        title: url.split('/').pop(),
        description: 'Direct image link',
        siteName: new URL(url).hostname,
        mediaType: 'image',
        previewUrl: url,
        previewType: 'image',
        contentType: type?.mime || 'image/jpeg',
        url: url
      };
    }

    const result = await unfurl(url);
    
    // Handle YouTube videos
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      return {
        title: result.title,
        description: result.description,
        siteName: 'YouTube',
        mediaType: 'video',
        previewUrl: result.open_graph?.images?.[0]?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        previewType: 'image',
        embedHtml: `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      };
    }

    // Handle Twitter embeds
    if (url.includes('twitter.com') || url.includes('x.com')) {
      const tweetId = url.split('/').pop()?.split('?')[0];
      if (tweetId) {
        return {
          title: result.title,
          description: result.description,
          siteName: 'Twitter',
          mediaType: 'social',
          previewUrl: result.open_graph?.images?.[0]?.url,
          previewType: 'image',
          embedHtml: `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote>`
        };
      }
    }

    // Handle Instagram embeds
    if (url.includes('instagram.com')) {
      const postId = url.split('/p/')?.pop()?.split('/')[0];
      if (postId) {
        return {
          title: result.title,
          description: result.description,
          siteName: 'Instagram',
          mediaType: 'social',
          previewUrl: result.open_graph?.images?.[0]?.url,
          previewType: 'image',
          embedHtml: `<blockquote class="instagram-media" data-instgrm-permalink="${url}"><a href="${url}"></a></blockquote>`
        };
      }
    }

    // Handle Facebook embeds
    if (url.includes('facebook.com')) {
      return {
        title: result.title,
        description: result.description,
        siteName: 'Facebook',
        mediaType: 'social',
        previewUrl: result.open_graph?.images?.[0]?.url,
        previewType: 'image',
        embedHtml: `<div class="fb-post" data-href="${url}"></div>`
      };
    }

    // Handle TikTok embeds
    if (url.includes('tiktok.com')) {
      const videoId = url.split('/video/')?.pop()?.split('?')[0];
      if (videoId) {
        return {
          title: result.title,
          description: result.description,
          siteName: 'TikTok',
          mediaType: 'social',
          previewUrl: result.open_graph?.images?.[0]?.url,
          previewType: 'image',
          embedHtml: `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}">
            <section><a target="_blank" href="${url}"></a></section>
          </blockquote>`
        };
      }
    }

    // Default metadata for other URLs
    return {
      title: result.title || url,
      description: result.description || 'No description available',
      siteName: result.site_name || new URL(url).hostname,
      mediaType: 'url',
      previewUrl: result.open_graph?.images?.[0]?.url || result.favicon,
      previewType: 'image',
      url: result.url || url
    };
  } catch (error) {
    console.error('Error extracting URL metadata:', error);
    
    // Attempt to provide basic metadata even if unfurl fails
    try {
      const urlObj = new URL(url);
      const isImage = await isImageUrl(url);
      return {
        title: url.split('/').pop() || url,
        description: 'No description available',
        siteName: urlObj.hostname,
        mediaType: isImage ? 'image' : 'url',
        previewUrl: isImage ? url : null,
        previewType: isImage ? 'image' : null,
        url: url
      };
    } catch (e) {
      return {
        title: url,
        description: 'No description available',
        mediaType: 'url',
        url: url
      };
    }
  }
}

async function extractFileMetadata(buffer, filename) {
  try {
    const type = await fileType.fromBuffer(buffer);
    const size = buffer.length;

    const baseMetadata = {
      fileName: filename,
      size: {
        original: size,
      },
      contentType: type?.mime || 'application/octet-stream'
    };

    if (type?.mime.startsWith('image/')) {
      const sizeOf = require('image-size');
      const dimensions = sizeOf(buffer);
      return {
        ...baseMetadata,
        mediaType: 'image',
        previewType: 'image',
        dimensions: {
          width: dimensions.width,
          height: dimensions.height
        },
        format: type.ext
      };
    }

    if (type?.mime.startsWith('video/')) {
      return {
        ...baseMetadata,
        mediaType: 'video',
        previewType: 'video',
        format: type.ext
      };
    }

    if (type?.mime.startsWith('audio/')) {
      return {
        ...baseMetadata,
        mediaType: 'audio',
        previewType: 'audio',
        format: type.ext
      };
    }

    return {
      ...baseMetadata,
      mediaType: 'static',
      previewType: 'file',
      format: type?.ext || filename.split('.').pop()
    };
  } catch (error) {
    console.error('Error extracting file metadata:', error);
    return {
      fileName: filename,
      mediaType: 'static',
      previewType: 'file',
      size: {
        original: buffer.length
      }
    };
  }
}

module.exports = {
  extractUrlMetadata,
  extractFileMetadata
};
