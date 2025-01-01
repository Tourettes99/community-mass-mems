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
  'youtube.com': async (url) => {
    const videoId = url.searchParams.get('v');
    if (!videoId) return null;
    return {
      platform: 'youtube',
      mediaType: 'video',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      embedType: 'youtube',
      embedHtml: `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="aspect-ratio: 16/9;"></iframe>`
    };
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
      embedHtml: `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="aspect-ratio: 16/9;"></iframe>`
    } : null;
  },
  'vimeo.com': async (url) => {
    const videoId = url.pathname.split('/').pop();
    if (!videoId) return null;
    try {
      const response = await fetch(`https://vimeo.com/api/v2/video/${videoId}.json`);
      const data = await response.json();
      const video = data[0];
      return {
        platform: 'vimeo',
        mediaType: 'video',
        videoId,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnail_large,
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
        embedType: 'vimeo',
        embedHtml: `<iframe src="https://player.vimeo.com/video/${videoId}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="aspect-ratio: 16/9;"></iframe>`
      };
    } catch (error) {
      console.error('Error fetching Vimeo metadata:', error);
      return {
        platform: 'vimeo',
        mediaType: 'video',
        videoId,
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
        embedType: 'vimeo',
        embedHtml: `<iframe src="https://player.vimeo.com/video/${videoId}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="aspect-ratio: 16/9;"></iframe>`
      };
    }
  },
  'twitter.com': (url) => {
    const tweetId = url.pathname.match(/status\/(\d+)/)?.[1];
    return tweetId ? {
      platform: 'twitter',
      mediaType: 'rich',
      tweetId,
      embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`,
      embedType: 'twitter',
      embedHtml: `<div style="min-height: 300px;"><blockquote class="twitter-tweet" data-dnt="true"><a href="${url.href}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></div>`
    } : null;
  },
  'x.com': (url) => PLATFORM_HANDLERS['twitter.com'](url),
  'soundcloud.com': (url) => ({
    platform: 'soundcloud',
    mediaType: 'audio',
    embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.href)}`,
    embedType: 'soundcloud',
    embedHtml: `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url.href)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>`
  }),
  'open.spotify.com': (url) => {
    const type = url.pathname.split('/')[1];
    const id = url.pathname.split('/')[2];
    return {
      platform: 'spotify',
      mediaType: 'audio',
      embedUrl: `https://open.spotify.com/embed/${type}/${id}`,
      embedType: 'spotify',
      embedHtml: `<iframe src="https://open.spotify.com/embed/${type}/${id}" width="100%" height="352" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`
    };
  },
  'tiktok.com': async (url) => {
    const videoId = url.pathname.split('/').pop();
    return {
      platform: 'tiktok',
      mediaType: 'video',
      videoId,
      embedUrl: `https://www.tiktok.com/embed/${videoId}`,
      embedType: 'tiktok',
      embedHtml: `<blockquote class="tiktok-embed" cite="${url.href}" data-video-id="${videoId}" style="max-width: 605px;min-width: 325px;"><section></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script>`
    };
  }
};

async function getUrlMetadata(urlString) {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.replace('www.', '');
    
    // Check for platform-specific handlers
    const handler = PLATFORM_HANDLERS[hostname];
    if (handler) {
      const platformData = await handler(url);
      if (platformData) {
        return {
          basicInfo: {
            title: platformData.title || `${platformData.platform} content`,
            description: platformData.description || '',
            mediaType: platformData.mediaType,
            thumbnailUrl: platformData.thumbnailUrl || '',
            platform: platformData.platform,
            contentUrl: urlString,
            domain: hostname,
            isSecure: url.protocol === 'https:'
          },
          embed: {
            embedUrl: platformData.embedUrl,
            embedHtml: platformData.embedHtml,
            embedType: platformData.embedType
          }
        };
      }
    }

    // Handle direct media files
    const extension = url.pathname.split('.').pop()?.toLowerCase();
    if (extension && Object.values(MEDIA_EXTENSIONS).flat().includes(extension)) {
      const mediaType = getMediaTypeFromExtension(extension);
      const filename = url.pathname.split('/').pop() || urlString;
      
      return {
        basicInfo: {
          title: filename,
          description: `${mediaType.toUpperCase()} file`,
          mediaType,
          thumbnailUrl: mediaType === 'image' ? urlString : '',
          platform: hostname,
          contentUrl: urlString,
          fileType: extension,
          domain: hostname,
          isSecure: url.protocol === 'https:'
        },
        embed: {
          embedUrl: urlString,
          embedHtml: mediaType === 'video' ? 
            `<video controls width="100%" height="100%" style="max-height: 80vh;"><source src="${urlString}" type="video/${extension}"></video>` :
            mediaType === 'audio' ?
            `<audio controls style="width: 100%;"><source src="${urlString}" type="audio/${extension}"></audio>` :
            mediaType === 'image' ?
            `<img src="${urlString}" alt="${filename}" style="max-width: 100%; max-height: 80vh; object-fit: contain;">` :
            undefined,
          embedType: mediaType
        }
      };
    }

    // Fallback to generic metadata
    const response = await fetch(urlString);
    const html = await response.text();
    const metadata = await metascraper({ url: urlString, html });
    
    return {
      basicInfo: {
        title: metadata.title || url.pathname || urlString,
        description: metadata.description || '',
        mediaType: 'article',
        thumbnailUrl: metadata.image || '',
        platform: metadata.publisher || hostname,
        contentUrl: urlString,
        domain: hostname,
        isSecure: url.protocol === 'https:'
      },
      embed: {
        embedUrl: urlString,
        embedHtml: `<div class="article-preview">
          ${metadata.image ? `<img src="${metadata.image}" alt="${metadata.title}" style="max-width: 100%; height: auto;">` : ''}
          <h3>${metadata.title || ''}</h3>
          <p>${metadata.description || ''}</p>
          <small>${metadata.publisher || hostname}</small>
        </div>`,
        embedType: 'article'
      }
    };
  } catch (error) {
    console.error('Error getting URL metadata:', error);
    const hostname = new URL(urlString).hostname;
    return {
      basicInfo: {
        title: urlString,
        description: 'Failed to load preview',
        mediaType: 'url',
        platform: hostname,
        contentUrl: urlString,
        domain: hostname,
        isSecure: urlString.startsWith('https://')
      },
      embed: {
        embedUrl: urlString,
        embedType: 'url'
      }
    };
  }
}

function getMediaTypeFromExtension(extension) {
  if (MEDIA_EXTENSIONS.images.includes(extension)) return 'image';
  if (MEDIA_EXTENSIONS.videos.includes(extension)) return 'video';
  if (MEDIA_EXTENSIONS.audio.includes(extension)) return 'audio';
  if (MEDIA_EXTENSIONS.documents.includes(extension)) return 'document';
  return 'url';
}

module.exports = {
  getUrlMetadata,
  getMediaTypeFromExtension
};
