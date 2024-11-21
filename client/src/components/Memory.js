import React from 'react';
import { Card, CardContent, CardMedia, Typography, Box } from '@mui/material';
import AudioPlayer from './memory-types/AudioPlayer';
import ImageMemory from './memory-types/ImageMemory';
import GifMemory from './memory-types/GifMemory';
import TextMemory from './memory-types/TextMemory';
import UrlMemory from './memory-types/UrlMemory';

const MEMORY_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  GIF: 'gif',
  AUDIO: 'audio',
  URL: 'url'
};

const Memory = ({ memory }) => {
  const renderMemoryContent = () => {
    switch (memory.type) {
      case MEMORY_TYPES.IMAGE:
        return <ImageMemory memory={memory} />;
      case MEMORY_TYPES.GIF:
        return <GifMemory memory={memory} />;
      case MEMORY_TYPES.AUDIO:
        return <AudioPlayer memory={memory} />;
      case MEMORY_TYPES.URL:
        return <UrlMemory memory={memory} />;
      case MEMORY_TYPES.TEXT:
        return <TextMemory memory={memory} />;
      default:
        return <Typography>Unsupported memory type</Typography>;
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.02)',
        },
      }}
    >
      {renderMemoryContent()}
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom>
          {memory.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {memory.description}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default Memory;