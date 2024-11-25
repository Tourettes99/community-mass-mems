import React, { useEffect, useCallback } from 'react';

const EMBED_SCRIPTS = {
  twitter: {
    src: 'https://platform.twitter.com/widgets.js',
    process: () => window.twttr?.widgets?.load(),
    selector: '.twitter-tweet'
  },
  instagram: {
    src: 'https://www.instagram.com/embed.js',
    process: () => window.instgrm?.Embeds?.process(),
    selector: '.instagram-media'
  },
  facebook: {
    src: 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v12.0',
    process: () => window.FB?.XFBML?.parse(),
    selector: '.fb-post'
  },
  tiktok: {
    src: 'https://www.tiktok.com/embed.js',
    process: () => {}, // TikTok handles its own processing
    selector: '.tiktok-embed'
  },
  pinterest: {
    src: 'https://assets.pinterest.com/js/pinit.js',
    process: () => {}, // Pinterest handles its own processing
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

        script.onload = resolve;
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
        await Promise.all(
          Object.entries(EMBED_SCRIPTS).map(([key, config]) => 
            loadScript(config, key)
          )
        );
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
