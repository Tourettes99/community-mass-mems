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

  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
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
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = getYouTubeVideoId(url);
        return (
          <Box sx={{ position: 'relative', paddingTop: '56.25%', width: '100%' }}>
            <iframe
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
              src={`https://www.youtube.com/embed/${videoId}`}
              title={title || 'YouTube video player'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </Box>
        );
      }
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
      if (metadata?.playbackHtml) {
        return (
          <Box
            dangerouslySetInnerHTML={{ __html: metadata.playbackHtml }}
            sx={{
              '& iframe': {
                width: '100% !important',
                maxHeight: '400px',
              },
            }}
          />
        );
      }
      // For other URLs, we'll handle them in the MemoryCard component
      return null;

    default:
      return null;
  }
};

export default EmbedPlayer;
