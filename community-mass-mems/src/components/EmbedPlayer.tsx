import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import WaveSurfer from 'wavesurfer.js';

interface EmbedPlayerProps {
  type: string;
  url: string;
  title?: string;
  metadata?: {
    mediaType?: string;
    embedUrl?: string;
    videoId?: string;
    platform?: string;
    width?: number;
    height?: number;
    [key: string]: any;
  };
}

const EmbedPlayer: React.FC<EmbedPlayerProps> = ({ type, url, title, metadata }) => {
  const audioRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const fallbackAudioRef = useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  const getEmbedUrl = () => {
    if (metadata?.embedUrl) return metadata.embedUrl;
    
    if (metadata?.platform === 'youtube' && metadata.videoId) {
      return `https://www.youtube.com/embed/${metadata.videoId}`;
    }
    
    if (metadata?.platform === 'vimeo' && metadata.videoId) {
      return `https://player.vimeo.com/video/${metadata.videoId}`;
    }
    
    return url;
  };

  const getAspectRatio = () => {
    if (metadata?.width && metadata?.height) {
      return (metadata.height / metadata.width) * 100;
    }
    return 56.25; // Default 16:9 aspect ratio
  };

  useEffect(() => {
    if (type === 'audio' && audioRef.current) {
      try {
        waveSurferRef.current = WaveSurfer.create({
          container: audioRef.current,
          waveColor: '#4a90e2',
          progressColor: '#2196f3',
          cursorColor: '#2196f3',
          barWidth: 2,
          barRadius: 3,
          responsive: true,
          height: 60,
          backend: 'WebAudio',
        });

        waveSurferRef.current.load(url);
        
        waveSurferRef.current.on('ready', () => {
          setIsLoading(false);
          setError(null);
        });

        waveSurferRef.current.on('error', () => {
          console.error('WaveSurfer error: Failed to load audio');
          setError('Failed to load audio');
          setUseFallback(true);
        });

        return () => {
          if (waveSurferRef.current) {
            waveSurferRef.current.destroy();
          }
        };
      } catch (err) {
        console.error('Failed to initialize WaveSurfer:', err);
        setError('Failed to initialize audio player');
        setUseFallback(true);
      }
    } else {
      setIsLoading(false);
    }
  }, [url, type]);

  if (error && useFallback && type === 'audio') {
    return (
      <Box sx={{ width: '100%', my: 2 }}>
        <audio 
          ref={fallbackAudioRef}
          controls
          style={{ width: '100%' }}
          onError={(e) => {
            console.error('Audio element error:', e);
            setError('Failed to play audio');
          }}
        >
          <source src={url} type="audio/mpeg" />
          <source src={url} type="audio/wav" />
          <source src={url} type="audio/ogg" />
          Your browser does not support the audio element.
        </audio>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ color: 'error.main', my: 2 }}>
        {error}
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Handle different content types
  switch (metadata?.mediaType || type) {
    case 'audio':
      return (
        <Box sx={{ width: '100%', my: 2 }}>
          <div ref={audioRef} />
        </Box>
      );

    case 'video':
      return (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            paddingTop: `${getAspectRatio()}%`,
            overflow: 'hidden',
            my: 2,
          }}
        >
          <iframe
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 0,
            }}
            src={getEmbedUrl()}
            title={title || 'Video content'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </Box>
      );

    case 'image':
      return (
        <Box
          component="img"
          src={url}
          alt={title || 'Image content'}
          sx={{
            width: '100%',
            height: 'auto',
            maxHeight: '500px',
            objectFit: 'contain',
            my: 2,
          }}
          onError={() => setError('Failed to load image')}
        />
      );

    case 'rich':
      if (metadata?.embedUrl) {
        return (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              paddingTop: `${getAspectRatio()}%`,
              overflow: 'hidden',
              my: 2,
            }}
          >
            <iframe
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
              src={metadata.embedUrl}
              title={title || 'Embedded content'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </Box>
        );
      }
      // Fallback for rich content without embed
      return (
        <Box
          sx={{
            width: '100%',
            my: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <Typography variant="body1">
            {title || 'Content preview not available'}
          </Typography>
        </Box>
      );

    default:
      return null;
  }
};

export default EmbedPlayer;
