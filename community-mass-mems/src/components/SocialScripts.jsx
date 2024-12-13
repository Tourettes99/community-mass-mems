import React, { useEffect, useState } from 'react';
import { convertToOrange } from '../utils/colorUtils';
import { normalizeFileUrl, isAllowedDomain, toDataUrl } from '../utils/urlUtils';

// Allowed domains for social media embeds
const ALLOWED_DOMAINS = [
  'twitter.com',
  'instagram.com',
  'facebook.com',
  'facebook.net',
  'tiktok.com',
  'pinterest.com',
  'pinimg.com',
  'platform.twitter.com',
  'cdn.syndication.twimg.com',
  'abs.twimg.com',
  'pbs.twimg.com',
  'video.twimg.com',
  'assets.pinterest.com'
];

const EMBED_SCRIPTS = {
  twitter: {
    src: 'https://platform.twitter.com/widgets.js',
    id: 'twitter-script',
    process: async () => {
      window.twttr?.widgets?.load();
      // Convert Twitter icons to orange
      const svgs = document.querySelectorAll('.twitter-tweet svg');
      for (const svg of svgs) {
        try {
          const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
          const normalizedUrl = normalizeFileUrl(svgUrl);
          if (!normalizedUrl) continue;
          
          const orangeUrl = await convertToOrange(normalizedUrl);
          if (!orangeUrl) continue;

          const img = document.createElement('img');
          img.src = orangeUrl;
          img.alt = 'Twitter icon';
          svg.parentNode?.replaceChild(img, svg);
        } catch (error) {
          console.error('Error processing Twitter icon:', error);
        }
      }
    },
    selector: '.twitter-tweet'
  },
  instagram: {
    src: 'https://www.instagram.com/embed.js',
    id: 'instagram-script',
    process: async () => {
      window.instgrm?.Embeds?.process();
      const svgs = document.querySelectorAll('.instagram-media svg');
      for (const svg of svgs) {
        try {
          const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
          const normalizedUrl = normalizeFileUrl(svgUrl);
          if (!normalizedUrl) continue;
          
          const orangeUrl = await convertToOrange(normalizedUrl);
          if (!orangeUrl) continue;

          const img = document.createElement('img');
          img.src = orangeUrl;
          img.alt = 'Instagram icon';
          svg.parentNode?.replaceChild(img, svg);
        } catch (error) {
          console.error('Error processing Instagram icon:', error);
        }
      }
    },
    selector: '.instagram-media'
  },
  facebook: {
    src: 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v12.0',
    id: 'facebook-script',
    process: async () => {
      window.FB?.XFBML?.parse();
      const svgs = document.querySelectorAll('.fb-post svg');
      for (const svg of svgs) {
        try {
          const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
          const normalizedUrl = normalizeFileUrl(svgUrl);
          if (!normalizedUrl) continue;
          
          const orangeUrl = await convertToOrange(normalizedUrl);
          if (!orangeUrl) continue;

          const img = document.createElement('img');
          img.src = orangeUrl;
          img.alt = 'Facebook icon';
          svg.parentNode?.replaceChild(img, svg);
        } catch (error) {
          console.error('Error processing Facebook icon:', error);
        }
      }
    },
    selector: '.fb-post'
  },
  tiktok: {
    src: 'https://www.tiktok.com/embed.js',
    id: 'tiktok-script',
    process: async () => {
      const svgs = document.querySelectorAll('.tiktok-embed svg');
      for (const svg of svgs) {
        try {
          const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
          const normalizedUrl = normalizeFileUrl(svgUrl);
          if (!normalizedUrl) continue;
          
          const orangeUrl = await convertToOrange(normalizedUrl);
          if (!orangeUrl) continue;

          const img = document.createElement('img');
          img.src = orangeUrl;
          img.alt = 'TikTok icon';
          svg.parentNode?.replaceChild(img, svg);
        } catch (error) {
          console.error('Error processing TikTok icon:', error);
        }
      }
    },
    selector: '.tiktok-embed'
  },
  pinterest: {
    src: 'https://assets.pinterest.com/js/pinit.js',
    id: 'pinterest-script',
    process: async () => {
      const svgs = document.querySelectorAll('[data-pin-do] svg');
      for (const svg of svgs) {
        try {
          const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
          const normalizedUrl = normalizeFileUrl(svgUrl);
          if (!normalizedUrl) continue;
          
          const orangeUrl = await convertToOrange(normalizedUrl);
          if (!orangeUrl) continue;

          const img = document.createElement('img');
          img.src = orangeUrl;
          img.alt = 'Pinterest icon';
          svg.parentNode?.replaceChild(img, svg);
        } catch (error) {
          console.error('Error processing Pinterest icon:', error);
        }
      }
    },
    selector: '[data-pin-do]'
  }
};

const loadScript = (src, id, nonce) => {
  return new Promise((resolve, reject) => {
    try {
      // Check if script already exists
      if (document.getElementById(id)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.id = id;
      if (nonce) script.nonce = nonce;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log(`Loaded script: ${id}`);
        resolve();
      };
      
      script.onerror = (error) => {
        console.error(`Error loading script ${id}:`, error);
        // Remove failed script
        script.remove();
        reject(error);
      };

      document.body.appendChild(script);
    } catch (error) {
      console.error(`Error setting up script ${id}:`, error);
      reject(error);
    }
  });
};

const SocialScripts = () => {
  const [loadingScripts, setLoadingScripts] = useState(true);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const loadAllScripts = async () => {
      try {
        setLoadingScripts(true);
        
        // Generate nonce for CSP
        const nonce = Math.random().toString(36).substring(2);
        
        // Load scripts in parallel with error handling for each
        const scriptPromises = EMBED_SCRIPTS.map(async script => {
          try {
            await loadScript(script.src, script.id, nonce);
          } catch (error) {
            setErrors(prev => [...prev, `Failed to load ${script.id}`]);
            console.error(`Error loading ${script.id}:`, error);
          }
        });

        await Promise.allSettled(scriptPromises);
      } catch (error) {
        console.error('Error in loadAllScripts:', error);
        setErrors(prev => [...prev, 'Failed to load social scripts']);
      } finally {
        setLoadingScripts(false);
      }
    };

    loadAllScripts();
  }, []);

  // Add error boundary
  if (errors.length > 0) {
    console.warn('Social script loading errors:', errors);
  }

  return null;
};

export default SocialScripts;
