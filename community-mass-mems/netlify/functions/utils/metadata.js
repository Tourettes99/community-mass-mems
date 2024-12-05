const { unfurl } = require('unfurl.js');
const fileType = require('file-type');
const fetch = require('node-fetch');
const ogs = require('open-graph-scraper');
const { getOEmbedProviders } = require('oembed-providers');

// Universal URL metadata extractor
async function extractUrlMetadata(url) {
  try {
    // Step 1: Try oEmbed first as it's the most reliable for supported sites
    const oEmbedData = await tryOEmbed(url);
    if (oEmbedData) {
      return {
        ...oEmbedData,
        url,
        mediaType: oEmbedData.type || 'rich',
        previewType: oEmbedData.type || 'rich',
        previewUrl: oEmbedData.thumbnail_url || oEmbedData.previewUrl
      };
    }

    // Step 2: Try unfurl + open-graph-scraper combo
    const [unfurlData, ogsData] = await Promise.all([
      unfurl(url),
      ogs({ url, fetchOptions: { timeout: 10000 } })
    ]);

    const ogImage = ogsData?.result?.ogImage?.[0];
    const unfurlImage = unfurlData?.open_graph?.images?.[0];

    // Merge all metadata sources with priority
    return {
      title: ogsData?.result?.ogTitle || unfurlData.title || url,
      description: ogsData?.result?.ogDescription || unfurlData.description || '',
      siteName: ogsData?.result?.ogSiteName || unfurlData.site_name || new URL(url).hostname,
      mediaType: determineMediaType(url, unfurlData, ogsData?.result),
      previewUrl: ogImage?.url || unfurlImage?.url || unfurlData.favicon,
      previewType: 'image',
      favicon: unfurlData.favicon,
      url: url,
      embedHtml: generateEmbedHtml(url, unfurlData, ogsData?.result),
      height: ogImage?.height || unfurlImage?.height,
      width: ogImage?.width || unfurlImage?.width,
      meta: {
        ...unfurlData,
        ...ogsData?.result
      }
    };
  } catch (error) {
    console.error('Error extracting URL metadata:', error);
    return createBasicMetadata(url);
  }
}

async function tryOEmbed(url) {
  try {
    const providers = await getOEmbedProviders();
    const provider = providers.find(p => p.matches(url));
    
    if (provider) {
      const endpoint = provider.getEndpoint(url);
      const response = await fetch(endpoint);
      const data = await response.json();
      
      return {
        title: data.title,
        description: data.description,
        siteName: provider.name,
        mediaType: data.type,
        previewUrl: data.thumbnail_url,
        previewType: 'rich',
        embedHtml: data.html,
        width: data.width,
        height: data.height,
        author: data.author_name,
        authorUrl: data.author_url
      };
    }
  } catch (error) {
    console.error('oEmbed extraction failed:', error);
  }
  return null;
}

function generateEmbedHtml(url, unfurlData, ogsData) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // YouTube
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('/').pop()?.split('?')[0]
        : new URLSearchParams(urlObj.search).get('v');
      if (videoId) {
        return `<iframe 
          width="560" 
          height="315" 
          src="https://www.youtube.com/embed/${videoId}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
        ></iframe>`;
      }
    }

    // Twitter/X
    if (domain.includes('twitter.com') || domain.includes('x.com')) {
      const tweetId = url.split('/').pop()?.split('?')[0];
      if (tweetId) {
        return `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote>`;
      }
    }

    // Instagram
    if (domain.includes('instagram.com')) {
      return `<blockquote class="instagram-media" data-instgrm-permalink="${url}"><a href="${url}"></a></blockquote>`;
    }

    // TikTok
    if (domain.includes('tiktok.com')) {
      const videoId = url.split('/video/')?.pop()?.split('?')[0];
      if (videoId) {
        return `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}">
          <section><a target="_blank" href="${url}"></a></section>
        </blockquote>`;
      }
    }

    // Facebook
    if (domain.includes('facebook.com')) {
      return `<div class="fb-post" data-href="${url}"></div>`;
    }

    // Vimeo
    if (domain.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      if (videoId) {
        return `<iframe 
          src="https://player.vimeo.com/video/${videoId}" 
          width="640" 
          height="360" 
          frameborder="0" 
          allow="autoplay; fullscreen; picture-in-picture" 
          allowfullscreen
        ></iframe>`;
      }
    }

    // SoundCloud
    if (domain.includes('soundcloud.com')) {
      return `<iframe 
        width="100%" 
        height="166" 
        scrolling="no" 
        frameborder="no" 
        src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500"
      ></iframe>`;
    }

    // Spotify
    if (domain.includes('spotify.com')) {
      const embedUrl = url.replace('open.spotify.com', 'open.spotify.com/embed');
      return `<iframe 
        src="${embedUrl}" 
        width="300" 
        height="380" 
        frameborder="0" 
        allowtransparency="true" 
        allow="encrypted-media"
      ></iframe>`;
    }

    return null;
  } catch (error) {
    console.error('Error generating embed HTML:', error);
    return null;
  }
}

function determineMediaType(url, unfurlData, ogsData) {
  // Check file extension first
  const fileExtension = url.split('.').pop()?.toLowerCase();
  if (fileExtension) {
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) return 'image';
    if (['mp4', 'webm', 'mov'].includes(fileExtension)) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(fileExtension)) return 'audio';
  }

  // Check OG type
  const ogType = ogsData?.ogType;
  if (ogType) {
    if (ogType.includes('video')) return 'video';
    if (ogType.includes('music') || ogType.includes('audio')) return 'audio';
    if (ogType.includes('article')) return 'article';
    if (ogType.includes('profile')) return 'profile';
  }

  // Check for media in unfurl data
  if (unfurlData?.open_graph?.videos?.length > 0) return 'video';
  if (unfurlData?.open_graph?.audio?.length > 0) return 'audio';
  
  return 'rich';
}

function createBasicMetadata(url) {
  try {
    const urlObj = new URL(url);
    return {
      title: url.split('/').pop() || url,
      description: 'No description available',
      siteName: urlObj.hostname,
      mediaType: 'url',
      previewUrl: null,
      previewType: null,
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
