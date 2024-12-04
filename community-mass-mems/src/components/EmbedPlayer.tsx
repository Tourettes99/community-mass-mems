import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import WaveSurfer from 'wavesurfer.js';

interface EmbedPlayerProps {
  type: string;
  url: string;
  title?: string;
  metadata?: {
    mediaType?: string;
    playbackHtml?: string;
    [key: string]: any;
  };
}

const EmbedPlayer: React.FC<EmbedPlayerProps> = ({ type, url, title, metadata }) => {
  const audioRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (type === 'audio' && audioRef.current) {
      waveSurferRef.current = WaveSurfer.create({
        container: audioRef.current,
        waveColor: '#4a90e2',
        progressColor: '#2196f3',
        cursorColor: '#2196f3',
        barWidth: 2,
        barRadius: 3,
        responsive: true,
        height: 60,
      });

      waveSurferRef.current.load(url);
      waveSurferRef.current.on('ready', () => setIsLoading(false));

      return () => {
        if (waveSurferRef.current) {
          waveSurferRef.current.destroy();
        }
      };
    }
  }, [url, type]);

  const getUrlEmbed = () => {
    if (!url) return null;
    
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      // YouTube videos
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        const videoId = url.includes('youtu.be') 
          ? url.split('/').pop() 
          : new URLSearchParams(new URL(url).search).get('v');
        if (videoId) {
          return {
            html: `<iframe 
              src="https://www.youtube.com/embed/${videoId}"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen></iframe>`,
            aspectRatio: '56.25%'
          };
        }
      }

      // Vimeo videos
      if (domain.includes('vimeo.com')) {
        const videoId = url.split('/').pop();
        if (videoId) {
          return {
            html: `<iframe 
              src="https://player.vimeo.com/video/${videoId}"
              allow="autoplay; fullscreen; picture-in-picture"
              allowfullscreen></iframe>`,
            aspectRatio: '56.25%'
          };
        }
      }

      // SoundCloud tracks
      if (domain.includes('soundcloud.com')) {
        return {
          html: `<iframe 
            src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500"
            allow="autoplay"></iframe>`,
          aspectRatio: '166px'
        };
      }

      // Spotify tracks/playlists
      if (domain.includes('spotify.com')) {
        const spotifyUrl = url.replace('open.spotify.com', 'open.spotify.com/embed');
        return {
          html: `<iframe 
            src="${spotifyUrl}"
            allow="encrypted-media; autoplay; clipboard-write; picture-in-picture"
            allowfullscreen></iframe>`,
          aspectRatio: '152px'
        };
      }

      // Discord attachments
      if (domain.includes('cdn.discordapp.com') || domain.includes('media.discordapp.net')) {
        const fileExtension = url.split('.').pop()?.toLowerCase();
        if (fileExtension) {
          // Handle videos
          if (['mp4', 'webm', 'mov'].includes(fileExtension)) {
            return {
              html: `<video controls style="width:100%; height:100%; max-height:400px;">
                <source src="${url}" type="video/${fileExtension}">
                Your browser does not support the video tag.
              </video>`,
              aspectRatio: '56.25%'
            };
          }
          // Handle images
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
            return {
              html: `<img src="${url}" alt="${title || 'Discord attachment'}" style="width:100%; height:100%; object-fit:contain;">`,
              aspectRatio: '56.25%'
            };
          }
        }
      }

      // Discord messages/channels
      if (domain.includes('discord.com')) {
        const messageMatch = url.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
        if (messageMatch) {
          return {
            html: `<iframe 
              src="https://discord.com/embed?messageId=${messageMatch[3]}&channelId=${messageMatch[2]}&guildId=${messageMatch[1]}"
              allowtransparency="true"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>`,
            aspectRatio: '400px'
          };
        }
        const inviteMatch = url.match(/invite\/([a-zA-Z0-9-]+)/);
        if (inviteMatch) {
          return {
            html: `<iframe 
              src="https://discord.com/widget?id=${inviteMatch[1]}&theme=dark"
              allowtransparency="true"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>`,
            aspectRatio: '500px'
          };
        }
      }

      // R1 Prompts
      if (domain.includes('r1prompts.com')) {
        const promptId = url.split('/').pop();
        if (promptId) {
          return {
            html: `<iframe 
              src="https://r1prompts.com/embed/${promptId}"
              style="border: none; border-radius: 8px;"
              sandbox="allow-scripts allow-same-origin allow-popups"
              loading="lazy"></iframe>`,
            aspectRatio: '400px'
          };
        }
      }

      // Suno.ai
      if (domain.includes('suno.ai')) {
        const songId = url.split('/').pop();
        if (songId) {
          return {
            html: `<iframe 
              src="https://app.suno.ai/embed/${songId}"
              style="border: none; border-radius: 12px;"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              allow="autoplay; encrypted-media"></iframe>`,
            aspectRatio: '160px'
          };
        }
      }

      // Twitter/X embed
      if (domain.includes('twitter.com') || domain.includes('x.com')) {
        const tweetId = url.match(/status\/(\d+)/)?.[1];
        if (tweetId) {
          return {
            html: `<blockquote class="twitter-tweet" data-dnt="true"><a href="${url}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`,
            aspectRatio: '100%'
          };
        }
      }
      
      // TikTok embed
      if (domain.includes('tiktok.com') || domain.includes('vm.tiktok.com')) {
        return {
          html: `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${url.split('/').pop()?.split('?')[0]}">
            <section><a target="_blank" href="${url}"></a></section>
          </blockquote>
          <script async src="https://www.tiktok.com/embed.js"></script>`,
          aspectRatio: '100%'
        };
      }
      
      // Facebook video embed
      if ((domain.includes('facebook.com') && url.includes('/videos/')) || domain.includes('fb.watch')) {
        return {
          html: `<div class="fb-video" data-href="${url}" data-width="auto" data-show-text="false">
            <blockquote cite="${url}" class="fb-xfbml-parse-ignore"></blockquote>
          </div>
          <script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0"></script>`,
          aspectRatio: '56.25%'
        };
      }

      // Instagram embed
      if (domain.includes('instagram.com')) {
        const instagramId = url.match(/\/(p|reel|tv)\/([^\/\?]+)/)?.[2];
        if (instagramId) {
          return {
            html: `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${url}">
              <a href="${url}" target="_blank"></a>
            </blockquote>
            <script async src="//www.instagram.com/embed.js"></script>`,
            aspectRatio: '100%'
          };
        }
      }

      // Reddit embed
      if (domain.includes('reddit.com')) {
        const redditUrl = url
          .replace('old.reddit.com', 'reddit.com')
          .replace('www.reddit.com', 'reddit.com')
          .replace('reddit.com', 'redditmedia.com');
          
        const embedUrl = redditUrl.includes('/comments/') 
          ? `https://www.redditmedia.com${new URL(url).pathname}?ref_source=embed&ref=share&embed=true`
          : `${redditUrl}?ref_source=embed&ref=share&embed=true`;

        return {
          html: `<iframe id="reddit-embed" 
            src="${embedUrl}"
            sandbox="allow-scripts allow-same-origin allow-popups"
            style="border: none;" 
            scrolling="no"
            width="100%"
            height="400"></iframe>`,
          aspectRatio: '56.25%'
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing URL:', error);
      return null;
    }
  };

  if (isLoading && type === 'audio') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  switch (type) {
    case 'video':
      return (
        <video
          controls
          style={{ width: '100%', maxHeight: '400px' }}
          src={url}
          title={title}
        >
          Your browser does not support the video tag.
        </video>
      );

    case 'audio':
      return <div ref={audioRef} style={{ width: '100%', minHeight: '60px' }} />;

    case 'url':
      const embedContent = getUrlEmbed();
      if (embedContent) {
        return (
          <Box 
            sx={{ 
              width: '100%',
              position: 'relative',
              paddingTop: embedContent.aspectRatio,
              '& iframe, & blockquote': {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '4px',
              },
            }}
            dangerouslySetInnerHTML={{ __html: embedContent.html }}
          />
        );
      }
      if (metadata?.playbackHtml) {
        return (
          <Box
            dangerouslySetInnerHTML={{ __html: metadata.playbackHtml }}
            sx={{
              '& iframe': {
                width: '100% !important',
                maxHeight: '400px',
                border: 'none',
                borderRadius: '4px',
              },
            }}
          />
        );
      }
      return null;

    default:
      return null;
  }
};

export default EmbedPlayer;
