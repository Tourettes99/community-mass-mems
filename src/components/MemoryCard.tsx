import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  IconButton,
  CardActions,
  Link,
} from '@mui/material';
import {
  Link as LinkIcon,
  TextFields,
  Image,
  VideoLibrary,
  AudioFile,
  Description,
  Share,
  Favorite,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface Memory {
  _id: string;
  type: string;
  url?: string;
  content?: string;
  metadata?: {
    title?: string;
    description?: string;
    mediaType?: string;
    siteName?: string;
    image?: string;
    [key: string]: any;
  };
  tags: string[];
  createdAt: string;
}

interface MemoryCardProps {
  memory: Memory;
}

const getMemoryTypeIcon = (type: string) => {
  switch (type) {
    case 'url':
      return <LinkIcon />;
    case 'text':
      return <TextFields />;
    case 'image':
      return <Image />;
    case 'video':
      return <VideoLibrary />;
    case 'audio':
      return <AudioFile />;
    default:
      return <Description />;
  }
};

const getMemoryPreview = (memory: Memory) => {
  const { type, url, content, metadata } = memory;

  switch (type) {
    case 'url':
      return metadata?.image ? (
        <CardMedia
          component="img"
          height="140"
          image={metadata.image}
          alt={metadata.title || 'URL preview'}
        />
      ) : null;
    case 'image':
      return url ? (
        <CardMedia
          component="img"
          height="140"
          image={url}
          alt={metadata?.title || 'Image memory'}
        />
      ) : null;
    case 'video':
      return url ? (
        <CardMedia
          component="video"
          height="140"
          image={url}
          title={metadata?.title || 'Video memory'}
          controls
        />
      ) : null;
    case 'audio':
      return url ? (
        <CardMedia
          component="audio"
          image={url}
          title={metadata?.title || 'Audio memory'}
          controls
        />
      ) : null;
    default:
      return null;
  }
};

const MemoryCard: React.FC<MemoryCardProps> = ({ memory }) => {
  const { type, metadata, tags, createdAt } = memory;

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
      {getMemoryPreview(memory)}
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {getMemoryTypeIcon(type)}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {format(new Date(createdAt), 'MMM d, yyyy')}
          </Typography>
        </Box>

        <Typography variant="h6" component="div" gutterBottom noWrap>
          {metadata?.title || 'Untitled Memory'}
        </Typography>

        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 2
          }}
        >
          {metadata?.description || content || 'No description available'}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {tags.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              variant="outlined"
              sx={{ borderRadius: 1 }}
            />
          ))}
        </Box>
      </CardContent>

      <CardActions disableSpacing>
        <IconButton aria-label="share">
          <Share />
        </IconButton>
        <IconButton aria-label="add to favorites">
          <Favorite />
        </IconButton>
      </CardActions>
    </Card>
  );
};

export default MemoryCard;
