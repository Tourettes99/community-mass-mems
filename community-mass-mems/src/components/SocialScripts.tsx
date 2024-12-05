import React, { useEffect } from 'react';
import Script from 'next/script';

const SocialScripts: React.FC = () => {
  useEffect(() => {
    // Twitter/X
    if (window.twttr?.widgets) {
      window.twttr.widgets.load();
    }

    // Facebook
    if (window.FB) {
      window.FB.XFBML.parse();
    }

    // Instagram
    if (window.instgrm?.Embeds) {
      window.instgrm.Embeds.process();
    }
  }, []);

  return (
    <>
      {/* Twitter/X */}
      <Script
        src="https://platform.twitter.com/widgets.js"
        strategy="lazyOnload"
      />

      {/* Facebook */}
      <Script
        src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0"
        strategy="lazyOnload"
        nonce="social_script"
      />

      {/* Instagram */}
      <Script
        src="//www.instagram.com/embed.js"
        strategy="lazyOnload"
      />

      {/* TikTok */}
      <Script
        src="https://www.tiktok.com/embed.js"
        strategy="lazyOnload"
      />
    </>
  );
};

// Add TypeScript declarations for social media SDKs
declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: () => void;
      };
    };
    FB?: {
      XFBML: {
        parse: () => void;
      };
    };
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

export default SocialScripts;
