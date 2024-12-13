const { unfurl } = require('unfurl.js');
const fileType = require('file-type');
const fetch = require('node-fetch');
const ogs = require('open-graph-scraper');
const { getOEmbedProviders } = require('oembed-providers');
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

// Universal URL metadata extractor
async function extractUrlMetadata(url) {
  try {
    // Parse URL components first
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    const fileExtension = url.split('.').pop()?.toLowerCase().split('?')[0]; // Handle URLs with query params

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

    // Step 2: Try multiple metadata extraction methods in parallel
    const [unfurlData, ogsData, metascraperData] = await Promise.allSettled([
      unfurl(url),
      ogs({ url, fetchOptions: { timeout: 10000 } }),
      fetch(url).then(res => res.text()).then(html => metascraper({ html, url }))
    ]);

    // Get successful results
    const unfurlResult = unfurlData.status === 'fulfilled' ? unfurlData.value : null;
    const ogsResult = ogsData.status === 'fulfilled' ? ogsData.value.result : null;
    const metascraperResult = metascraperData.status === 'fulfilled' ? metascraperData.value : null;

    // Combine metadata with priority
    const metadata = {
      title: metascraperResult?.title || ogsResult?.ogTitle || unfurlResult?.title || url,
      description: metascraperResult?.description || ogsResult?.ogDescription || unfurlResult?.description || '',
      siteName: metascraperResult?.publisher || ogsResult?.ogSiteName || unfurlResult?.site_name || domain,
      author: metascraperResult?.author || ogsResult?.ogArticle?.author || unfurlResult?.author,
      publishedDate: metascraperResult?.date || ogsResult?.ogArticle?.publishedTime || unfurlResult?.published,
      mediaType: determineMediaType(url, unfurlResult, ogsResult),
      previewUrl: null,
      embedHtml: '',  // Initialize as empty string
      favicon: unfurlResult?.favicon || ogsResult?.favicon,
      ogImage: ogsResult?.ogImage?.url || unfurlResult?.open_graph?.images?.[0]?.url,
      dimensions: {
        height: ogsResult?.ogImage?.height || unfurlResult?.open_graph?.images?.[0]?.height,
        width: ogsResult?.ogImage?.width || unfurlResult?.open_graph?.images?.[0]?.width
      }
    };

    // Special handling for Discord CDN and media URLs
    if (domain === 'cdn.discordapp.com' || domain === 'media.discordapp.net') {
      metadata.siteName = 'Discord';
      // Clean the filename from query parameters
      metadata.title = url.split('/').pop()?.split('?')[0] || url;
      
      // Get clean file extension (before any query params)
      const cleanExtension = metadata.title.split('.').pop()?.toLowerCase();
      
      if (cleanExtension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov'].includes(cleanExtension)) {
        if (cleanExtension === 'gif') {
          metadata.mediaType = 'video'; // Handle GIFs as videos for autoplay
          metadata.previewUrl = url;
          metadata.embedHtml = `<video autoplay loop muted playsinline style="width: 100%; height: 100%; object-fit: contain;"><source src="${url}" type="video/mp4"><img src="${url}" alt="${metadata.title}" style="width: 100%; height: 100%; object-fit: contain;"></video>`;
        } else if (['mp4', 'webm', 'mov'].includes(cleanExtension)) {
          metadata.mediaType = 'video';
          metadata.previewUrl = url;
          const mimeTypes = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'mov': 'video/quicktime'
          };
          metadata.embedHtml = `<video controls playsinline style="width: 100%; height: 100%; object-fit: contain;"><source src="${url}" type="${mimeTypes[cleanExtension]}">Your browser does not support the video tag.</video>`;
        } else {
          // Regular images (jpg, jpeg, png, webp)
          metadata.mediaType = 'image';
          metadata.previewUrl = url;
          metadata.embedHtml = `<img src="${url}" alt="${metadata.title}" loading="lazy" style="width: 100%; height: 100%; object-fit: contain;">`;
        }
      }
      return metadata;
    }

    // Handle regular direct media URLs
    if (fileExtension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov'].includes(fileExtension)) {
      metadata.mediaType = ['mp4', 'webm', 'mov'].includes(fileExtension) ? 'video' : 'image';
      metadata.previewUrl = url;
      metadata.title = url.split('/').pop();
      
      // For videos, create an embed
      if (metadata.mediaType === 'video') {
        metadata.embedHtml = `<video 
          controls 
          playsinline
          style="width: 100%; height: 100%;"
        >
          <source src="${url}" type="video/${fileExtension}">
          Your browser does not support the video tag.
        </video>`;
      }
      return metadata;
    }

    // Handle Twitter URLs
    if (domain === 'twitter.com' || domain === 'x.com') {
      // Try to get video URL from meta tags
      const videoUrl = unfurlResult?.twitter_card?.players?.[0]?.url || 
                      unfurlResult?.twitter_card?.player?.url ||
                      ogsResult?.ogVideo?.url ||
                      ogsResult?.twitterPlayer?.url;

      const videoType = unfurlResult?.twitter_card?.players?.[0]?.content_type || 
                       ogsResult?.ogVideo?.type;

      // Handle Twitter GIFs
      if (unfurlResult?.twitter_card?.type === 'animated_gif' || 
          videoUrl?.includes('tweet_video') ||
          unfurlResult?.twitter_card?.image_type === 'animated_gif') {
        metadata.mediaType = 'video';
        metadata.previewUrl = unfurlResult?.twitter_card?.image_url || ogsResult?.ogImage?.url;
        metadata.embedHtml = `<video autoplay loop muted playsinline style="width: 100%; height: 100%; object-fit: contain;" poster="${metadata.previewUrl}"><source src="${videoUrl}" type="video/mp4"><img src="${metadata.previewUrl}" alt="${metadata.title}" style="width: 100%; height: 100%; object-fit: contain;"></video>`;
        return metadata;
      }

      // Handle Twitter Videos
      if (videoUrl && (unfurlResult?.twitter_card?.type === 'video' || 
                      unfurlResult?.twitter_card?.type === 'player' ||
                      ogsResult?.ogType === 'video')) {
        metadata.mediaType = 'video';
        metadata.previewUrl = unfurlResult?.twitter_card?.image_url || ogsResult?.ogImage?.url;
        
        // If it's a direct video URL
        if (videoUrl.endsWith('.mp4') || videoType?.includes('mp4')) {
          metadata.embedHtml = `<video controls playsinline style="width: 100%; height: 100%; object-fit: contain;" poster="${metadata.previewUrl}"><source src="${videoUrl}" type="video/mp4">Your browser does not support the video tag.</video>`;
        } else {
          // Use Twitter's player iframe
          metadata.embedHtml = `<iframe src="${videoUrl}" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe>`;
        }
        return metadata;
      }
    }

    // Handle YouTube URLs
    if ((domain.includes('youtube.com') || domain.includes('youtu.be'))) {
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
      if (videoId) {
        metadata.embedHtml = `<iframe 
          width="560" 
          height="315" 
          src="https://www.youtube.com/embed/${videoId}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
        ></iframe>`;
        metadata.mediaType = 'video';
        metadata.previewUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        return metadata;
      }
    }

    // Handle OG video data
    if (ogsResult?.ogVideo?.url || ogsResult?.ogVideoSecureUrl) {
      const videoUrl = ogsResult.ogVideoSecureUrl || ogsResult.ogVideo.url;
      const videoType = ogsResult?.ogVideo?.type || '';
      metadata.mediaType = 'video';
      metadata.previewUrl = videoUrl;
      
      // Check if it's an MP4 either by extension or content type
      if (videoUrl.toLowerCase().endsWith('.mp4') || 
          videoType.toLowerCase().includes('mp4') ||
          videoType.toLowerCase() === 'video/mp4') {
        metadata.embedHtml = `<video 
          controls 
          playsinline
          style="width: 100%; height: 100%;"
          poster="${ogsResult.ogImage?.url || ''}"
        >
          <source src="${videoUrl}" type="video/mp4">
          Your browser does not support the video tag.
        </video>`;
      }
      return metadata;
    }

    // Handle Twitter video card
    if (unfurlResult?.twitter_card?.type === 'video' || unfurlResult?.twitter_card?.type === 'player') {
      const videoUrl = unfurlResult.twitter_card.players?.[0]?.url || 
                      unfurlResult.twitter_card.video_url ||
                      unfurlResult.twitter_card.stream_url;
      
      if (videoUrl) {
        metadata.mediaType = 'video';
        metadata.previewUrl = unfurlResult.twitter_card.image_url || videoUrl;
        
        // If it's an MP4 stream
        if (videoUrl.toLowerCase().endsWith('.mp4') || 
            unfurlResult.twitter_card.content_type?.toLowerCase().includes('mp4')) {
          metadata.embedHtml = `<video 
            controls 
            playsinline
            style="width: 100%; height: 100%;"
            poster="${unfurlResult.twitter_card.image_url || ''}"
          >
            <source src="${videoUrl}" type="video/mp4">
            Your browser does not support the video tag.
          </video>`;
        }
        return metadata;
      }
    }

    // Handle OG image data
    if (ogsResult?.ogImage?.url) {
      metadata.previewUrl = ogsResult.ogImage.url;
      if (!metadata.mediaType || metadata.mediaType === 'rich') {
        metadata.mediaType = 'image';
      }
    }
    // Fallback to unfurl data
    else if (unfurlResult?.open_graph?.images?.[0]?.url) {
      metadata.previewUrl = unfurlResult.open_graph.images[0].url;
      if (!metadata.mediaType || metadata.mediaType === 'rich') {
        metadata.mediaType = 'image';
      }
    }

    // Create a preview card for websites without specific media
    if (metadata.mediaType === 'rich' || !metadata.mediaType) {
      metadata.mediaType = 'rich';
      
      // Build a nice looking preview card
      const faviconHtml = metadata.favicon ? 
        `<img src="${metadata.favicon}" alt="" style="width: 16px; height: 16px; margin-right: 8px;">` : '';
      
      const imageHtml = metadata.previewUrl ? 
        `<div style="width: 100%; padding-top: 52.5%; position: relative; background: #f5f5f5; margin-bottom: 12px;">
           <img src="${metadata.previewUrl}" alt="${metadata.title}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
         </div>` : '';

      metadata.embedHtml = `
        <div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background: white;">
          ${imageHtml}
          <div style="padding: 16px;">
            <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis;">
              ${metadata.title}
            </div>
            ${metadata.description ? 
              `<div style="font-size: 14px; color: #666; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${metadata.description}
              </div>` : ''}
            <div style="display: flex; align-items: center; font-size: 12px; color: #666;">
              ${faviconHtml}
              ${metadata.siteName || domain}
            </div>
          </div>
        </div>
      `.replace(/\s+/g, ' ').trim();
    }

    return metadata;
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
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
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
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // Check for known video platforms
    if (domain.includes('youtube.com') || domain.includes('youtu.be') ||
        domain.includes('vimeo.com') || domain.includes('tiktok.com')) {
      return 'video';
    }

    // Check for known social media platforms
    if (domain.includes('twitter.com') || domain.includes('x.com') ||
        domain.includes('instagram.com') || domain.includes('facebook.com')) {
      return 'rich';
    }

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
    if (unfurlData?.open_graph?.images?.length > 0) return 'article';

    // Default to article if there's a title and description
    if ((ogsData?.ogTitle || unfurlData.title) && 
        (ogsData?.ogDescription || unfurlData.description)) {
      return 'article';
    }
    
    return 'rich';
  } catch (error) {
    console.error('Error determining media type:', error);
    return 'rich';
  }
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
