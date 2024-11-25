import React, { useEffect, useCallback } from 'react';
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

const SocialScripts = () => {
  const loadScript = useCallback((config, key) => {
    try {
      const existingScript = document.querySelector(`script[src="${config.src}"]`);
      if (existingScript) {
        return Promise.resolve();
      }

      if (!isAllowedDomain(config.src, ALLOWED_DOMAINS)) {
        console.error(`Script from ${config.src} is not allowed`);
        return Promise.reject(new Error(`Script from ${config.src} is not allowed`));
      }

      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = config.src;
        script.async = true;
        script.defer = true;
        if (key === 'facebook') {
          script.crossOrigin = 'anonymous';
          // Generate a random nonce for additional security
          const nonce = Math.random().toString(36).substring(2);
          script.nonce = nonce;
        }

        script.onload = () => {
          // Add a small delay to ensure the social media widgets are fully initialized
          setTimeout(() => {
            resolve();
          }, 100);
        };
        script.onerror = () => reject(new Error(`Failed to load ${key} script`));
        document.body.appendChild(script);
      });
    } catch (error) {
      console.error(`Error loading ${key} script:`, error);
      return Promise.reject(error);
    }
  }, []);

  const processEmbeds = useCallback(() => {
    Object.entries(EMBED_SCRIPTS).forEach(([key, config]) => {
      try {
        config.process();
      } catch (error) {
        console.error(`Error processing ${key} embeds:`, error);
      }
    });
  }, []);

  useEffect(() => {
    const loadAllScripts = async () => {
      try {
        // Load scripts sequentially to ensure proper initialization
        for (const [key, config] of Object.entries(EMBED_SCRIPTS)) {
          await loadScript(config, key);
        }
        processEmbeds();
      } catch (error) {
        console.error('Error loading social scripts:', error);
      }
    };

    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // ELEMENT_NODE
            const selectors = Object.values(EMBED_SCRIPTS).map(config => config.selector);
            if (
              selectors.some(selector => 
                node.matches?.(selector) || 
                node.querySelector?.(selector)
              )
            ) {
              shouldProcess = true;
            }
          }
        });
      });

      if (shouldProcess) {
        processEmbeds();
      }
    });

    loadAllScripts();

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      // Clean up scripts on unmount
      Object.values(EMBED_SCRIPTS).forEach(config => {
        const script = document.querySelector(`script[src="${config.src}"]`);
        if (script?.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, [loadScript, processEmbeds]);

  return null;
};

export default SocialScripts;
