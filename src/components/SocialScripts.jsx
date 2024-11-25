import React, { useEffect, useCallback } from 'react';
import { convertToOrange } from '../utils/colorUtils';

const EMBED_SCRIPTS = {
  twitter: {
    src: 'https://platform.twitter.com/widgets.js',
    process: () => {
      window.twttr?.widgets?.load();
      // Convert Twitter icons to orange
      document.querySelectorAll('.twitter-tweet svg').forEach(async (svg) => {
        const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
        const orangeUrl = await convertToOrange(svgUrl);
        const img = document.createElement('img');
        img.src = orangeUrl;
        svg.parentNode.replaceChild(img, svg);
      });
    },
    selector: '.twitter-tweet'
  },
  instagram: {
    src: 'https://www.instagram.com/embed.js',
    process: () => {
      window.instgrm?.Embeds?.process();
      // Convert Instagram icons to orange
      document.querySelectorAll('.instagram-media svg').forEach(async (svg) => {
        const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
        const orangeUrl = await convertToOrange(svgUrl);
        const img = document.createElement('img');
        img.src = orangeUrl;
        svg.parentNode.replaceChild(img, svg);
      });
    },
    selector: '.instagram-media'
  },
  facebook: {
    src: 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v12.0',
    process: () => {
      window.FB?.XFBML?.parse();
      // Convert Facebook icons to orange
      document.querySelectorAll('.fb-post svg').forEach(async (svg) => {
        const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
        const orangeUrl = await convertToOrange(svgUrl);
        const img = document.createElement('img');
        img.src = orangeUrl;
        svg.parentNode.replaceChild(img, svg);
      });
    },
    selector: '.fb-post'
  },
  tiktok: {
    src: 'https://www.tiktok.com/embed.js',
    process: () => {
      // TikTok handles its own processing
      // Convert TikTok icons to orange
      document.querySelectorAll('.tiktok-embed svg').forEach(async (svg) => {
        const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
        const orangeUrl = await convertToOrange(svgUrl);
        const img = document.createElement('img');
        img.src = orangeUrl;
        svg.parentNode.replaceChild(img, svg);
      });
    },
    selector: '.tiktok-embed'
  },
  pinterest: {
    src: 'https://assets.pinterest.com/js/pinit.js',
    process: () => {
      // Pinterest handles its own processing
      // Convert Pinterest icons to orange
      document.querySelectorAll('[data-pin-do] svg').forEach(async (svg) => {
        const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
        const orangeUrl = await convertToOrange(svgUrl);
        const img = document.createElement('img');
        img.src = orangeUrl;
        svg.parentNode.replaceChild(img, svg);
      });
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
