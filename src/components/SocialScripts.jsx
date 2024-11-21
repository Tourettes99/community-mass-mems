import React, { useEffect } from 'react';

const SocialScripts = () => {
  useEffect(() => {
    // Load Twitter widget script
    const twitterScript = document.createElement('script');
    twitterScript.src = 'https://platform.twitter.com/widgets.js';
    twitterScript.async = true;
    document.body.appendChild(twitterScript);

    // Load Instagram embed script
    const instagramScript = document.createElement('script');
    instagramScript.src = '//www.instagram.com/embed.js';
    instagramScript.async = true;
    document.body.appendChild(instagramScript);

    // Load Facebook SDK
    const fbScript = document.createElement('script');
    fbScript.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v12.0';
    fbScript.async = true;
    fbScript.crossOrigin = 'anonymous';
    fbScript.nonce = 'random123'; // You should generate this dynamically
    document.body.appendChild(fbScript);

    // Load TikTok embed script
    const tiktokScript = document.createElement('script');
    tiktokScript.src = 'https://www.tiktok.com/embed.js';
    tiktokScript.async = true;
    document.body.appendChild(tiktokScript);

    // Load Pinterest embed script
    const pinterestScript = document.createElement('script');
    pinterestScript.src = '//assets.pinterest.com/js/pinit.js';
    pinterestScript.async = true;
    pinterestScript.defer = true;
    document.body.appendChild(pinterestScript);

    // Function to process embeds
    const processEmbeds = () => {
      // Process Instagram embeds
      if (window.instgrm) {
        window.instgrm.Embeds.process();
      }

      // Process Twitter embeds
      if (window.twttr) {
        window.twttr.widgets.load();
      }

      // Process Facebook embeds
      if (window.FB) {
        window.FB.XFBML.parse();
      }
    };

    // Process embeds initially and set up a mutation observer
    processEmbeds();

    // Set up mutation observer to handle dynamically added content
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // ELEMENT_NODE
            if (
              node.matches?.('.twitter-tweet, .instagram-media, .fb-post, .tiktok-embed, [data-pin-do]') ||
              node.querySelector?.('.twitter-tweet, .instagram-media, .fb-post, .tiktok-embed, [data-pin-do]')
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

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup function
    return () => {
      observer.disconnect();
      [twitterScript, instagramScript, fbScript, tiktokScript, pinterestScript].forEach(script => {
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, []);

  return null;
};

export default SocialScripts;
