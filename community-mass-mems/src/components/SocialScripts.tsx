import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';

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
    <Helmet>
      {/* Twitter/X */}
      <script 
        async 
        src="https://platform.twitter.com/widgets.js"
      />

      {/* Facebook */}
      <script 
        async 
        src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0"
        nonce="social_script"
      />

      {/* Instagram */}
      <script 
        async 
        src="//www.instagram.com/embed.js"
      />

      {/* TikTok */}
      <script 
        async 
        src="https://www.tiktok.com/embed.js"
      />
    </Helmet>
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
