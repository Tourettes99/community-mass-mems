import React, { useState } from 'react';
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
  Collapse,
  Button,
  Stack
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
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ThumbUp,
  ThumbDown
} from '@mui/icons-material';
import EmbedPlayer from './EmbedPlayer';
import { Memory } from '../types';

interface MemoryCardProps {
  memory: Memory;
  onVote?: (memoryId: string, vote: 1 | -1) => Promise<void>;
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

const getMemoryPreview = (memory: Memory, expanded: boolean) => {
  const { type, url, content, metadata } = memory;

  // For media content, use the EmbedPlayer
  if ((type === 'video' || type === 'audio') && url) {
    return (
      <Box sx={{ p: 2 }}>
        <EmbedPlayer
          type={type}
          url={url}
          title={metadata?.title}
          metadata={metadata}
        />
      </Box>
    );
  }

  switch (type) {
    case 'url':
      if (metadata?.playbackHtml) {
        return (
          <Box sx={{ p: 2 }}>
            <EmbedPlayer
              type={type}
              url={url || ''}
              title={metadata?.title}
              metadata={metadata}
            />
          </Box>
        );
      }
      return metadata?.previewUrl ? (
        <Link href={url} target="_blank" rel="noopener noreferrer">
          <CardMedia
            component="img"
            height="140"
            image={metadata.previewUrl}
            alt={metadata.title || 'URL preview'}
          />
        </Link>
      ) : null;

    case 'image':
      return url ? (
        <CardMedia
          component="img"
          sx={{ maxHeight: expanded ? '400px' : '140px', objectFit: 'contain' }}
          image={url}
          alt={metadata?.title || 'Image memory'}
        />
      ) : null;

    default:
      return null;
  }
};

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onVote }) => {
  const [expanded, setExpanded] = useState(false);
  const [votes, setVotes] = useState(memory.votes || 0);
  const [userVote, setUserVote] = useState<1 | -1 | 0>(0);
  const [isVoting, setIsVoting] = useState(false);
  const { type, metadata, tags = [], createdAt, url, content } = memory;

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleVote = async (vote: 1 | -1) => {
    if (isVoting || !onVote) return;

    setIsVoting(true);
    try {
      // If user is clicking the same vote button again, remove their vote
      const newVote = userVote === vote ? 0 : vote;
      const voteDiff = newVote - userVote;
      
      // Optimistically update UI
      setVotes(prev => prev + voteDiff);
      setUserVote(newVote);

      // Call the API
      await onVote(memory._id, vote);
    } catch (error) {
      // Revert on error
      setVotes(prev => prev - (vote - userVote));
      setUserVote(userVote);
      console.error('Failed to vote:', error);
    } finally {
      setIsVoting(false);
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
      {getMemoryPreview(memory, expanded)}
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {getMemoryTypeIcon(type)}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {new Date(createdAt).toLocaleDateString('en-US', { 
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </Typography>
        </Box>

        {url && type === 'url' && (
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            {metadata?.favicon && (
              <Box
                component="img"
                src={metadata.favicon}
                alt={metadata?.siteName || 'Website favicon'}
                sx={{ width: 16, height: 16, objectFit: 'contain' }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <Link
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
              underline="hover"
            >
              {metadata?.siteName || new URL(url).hostname}
            </Link>
          </Stack>
        )}

        <Typography variant="h6" component="div" gutterBottom noWrap>
          {metadata?.title || 'Untitled Memory'}
        </Typography>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Typography variant="body2" color="text.secondary" paragraph>
            {metadata?.description || content || 'No description available'}
          </Typography>
        </Collapse>

        {!expanded && (
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
        )}

        {tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                variant="outlined"
                color="primary"
              />
            ))}
          </Box>
        )}
      </CardContent>

      <CardActions disableSpacing>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton 
            onClick={() => handleVote(1)}
            color={userVote === 1 ? "primary" : "default"}
            disabled={isVoting}
          >
            <ThumbUp />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            {votes}
          </Typography>
          <IconButton 
            onClick={() => handleVote(-1)}
            color={userVote === -1 ? "primary" : "default"}
            disabled={isVoting}
          >
            <ThumbDown />
          </IconButton>
        </Stack>
        <IconButton aria-label="share">
          <Share />
        </IconButton>
        <IconButton aria-label="add to favorites">
          <Favorite />
        </IconButton>
        <Button
          onClick={handleExpandClick}
          endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          size="small"
          sx={{ ml: 'auto' }}
        >
          {expanded ? 'Show Less' : 'Show More'}
        </Button>
      </CardActions>
    </Card>
  );
};

export default MemoryCard;
