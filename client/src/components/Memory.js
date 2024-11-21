import React from 'react';
import { Card, CardContent, CardMedia, Typography, Box, Chip, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';
import ImageIcon from '@mui/icons-material/Image';
import GifIcon from '@mui/icons-material/Gif';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import LinkIcon from '@mui/icons-material/Link';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
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

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
    '& .memory-content': {
      filter: 'brightness(1.1)',
    },
    '& .memory-overlay': {
      opacity: 1,
    },
  },
}));

const ContentWrapper = styled(Box)({
  position: 'relative',
  flexGrow: 1,
  '& .memory-content': {
    transition: 'filter 0.3s ease',
  },
});

const Overlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 100%)',
  opacity: 0,
  transition: 'opacity 0.3s ease',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  padding: '20px',
  zIndex: 1,
  '&.memory-overlay': {
    opacity: 0,
  },
});

const MetadataChip = styled(Chip)(({ theme }) => ({
  margin: '2px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  '& .MuiChip-icon': {
    color: theme.palette.primary.main,
  },
}));

const Memory = ({ memory }) => {
  const renderMetadata = () => {
    const metadata = [];

    switch (memory.type) {
      case MEMORY_TYPES.IMAGE:
        if (memory.metadata) {
          metadata.push(
            <MetadataChip
              key="filename"
              icon={<ImageIcon />}
              label={memory.metadata.filename || 'Untitled'}
              size="small"
            />,
            <MetadataChip
              key="resolution"
              icon={<ImageIcon />}
              label={`${memory.metadata.width || 0}x${memory.metadata.height || 0}`}
              size="small"
            />,
            <MetadataChip
              key="format"
              icon={<ImageIcon />}
              label={memory.metadata.format || 'Unknown'}
              size="small"
            />
          );
        }
        break;

      case MEMORY_TYPES.GIF:
        if (memory.metadata) {
          metadata.push(
            <MetadataChip
              key="filename"
              icon={<GifIcon />}
              label={memory.metadata.filename || 'Untitled'}
              size="small"
            />,
            <MetadataChip
              key="resolution"
              icon={<GifIcon />}
              label={`${memory.metadata.width || 0}x${memory.metadata.height || 0}`}
              size="small"
            />,
            <MetadataChip
              key="fps"
              icon={<GifIcon />}
              label={`${memory.metadata.fps || 0} FPS`}
              size="small"
            />,
            <MetadataChip
              key="format"
              icon={<GifIcon />}
              label="GIF"
              size="small"
            />
          );
        }
        break;

      case MEMORY_TYPES.AUDIO:
        if (memory.metadata) {
          metadata.push(
            <MetadataChip
              key="filename"
              icon={<AudioFileIcon />}
              label={memory.metadata.filename || 'Untitled'}
              size="small"
            />,
            <MetadataChip
              key="duration"
              icon={<AudioFileIcon />}
              label={memory.metadata.duration || '0:00'}
              size="small"
            />,
            <MetadataChip
              key="format"
              icon={<AudioFileIcon />}
              label={memory.metadata.format || 'Unknown'}
              size="small"
            />
          );
        }
        break;

      case MEMORY_TYPES.URL:
        if (memory.metadata) {
          metadata.push(
            <MetadataChip
              key="title"
              icon={<LinkIcon />}
              label={memory.metadata.title || 'Untitled'}
              size="small"
            />
          );
          if (memory.metadata.description) {
            metadata.push(
              <MetadataChip
                key="description"
                icon={<LinkIcon />}
                label={memory.metadata.description.substring(0, 50) + '...'}
                size="small"
              />
            );
          }
        }
        break;

      case MEMORY_TYPES.TEXT:
        metadata.push(
          <MetadataChip
            key="type"
            icon={<TextSnippetIcon />}
            label="Text Memory"
            size="small"
          />
        );
        break;

      default:
        break;
    }

    return metadata;
  };

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

  const isMediaType = memory.type === MEMORY_TYPES.IMAGE || 
                     memory.type === MEMORY_TYPES.GIF || 
                     memory.type === MEMORY_TYPES.URL;

  return (
    <StyledCard>
      <ContentWrapper>
        <Box className="memory-content">
          {renderMemoryContent()}
        </Box>
        {isMediaType && (
          <Overlay className="memory-overlay">
            {memory.title && (
              <Typography variant="h6" component="div" color="white" gutterBottom>
                {memory.title}
              </Typography>
            )}
            {memory.description && (
              <Typography variant="body2" color="white">
                {memory.description}
              </Typography>
            )}
            <Stack direction="row" flexWrap="wrap" spacing={1} sx={{ mt: 2 }}>
              {renderMetadata()}
            </Stack>
          </Overlay>
        )}
      </ContentWrapper>
      {!isMediaType && (
        <CardContent>
          {memory.title && (
            <Typography variant="h6" component="div" gutterBottom>
              {memory.title}
            </Typography>
          )}
          {memory.description && (
            <Typography variant="body2" color="text.secondary">
              {memory.description}
            </Typography>
          )}
          <Stack direction="row" flexWrap="wrap" spacing={1} sx={{ mt: 2 }}>
            {renderMetadata()}
          </Stack>
        </CardContent>
      )}
    </StyledCard>
  );
};

export default Memory;