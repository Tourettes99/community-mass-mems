import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Link,
  Skeleton,
  CardActionArea,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Article as ArticleIcon,
  Link as LinkIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
} from '@mui/icons-material';

const MemoryCard = ({ memory }) => {
  if (!memory) return null;

  const {
    url,
    type,
    metadata = {},
    votes = { up: 0, down: 0 }
  } = memory;

  const {
    title,
    description,
    siteName,
    previewUrl,
    embedHtml,
    previewType,
    mediaType,
  } = metadata;

  const [voteState, setVoteState] = useState({ up: false, down: false });
  const [voteCount, setVoteCount] = useState({ up: votes.up || 0, down: votes.down || 0 });
  const [isVoting, setIsVoting] = useState(false);

  const getMediaIcon = () => {
    switch (mediaType || type) {
      case 'image':
        return <ImageIcon />;
      case 'video':
        return <VideoIcon />;
      case 'article':
        return <ArticleIcon />;
      default:
        return <LinkIcon />;
    }
  };

  const renderMedia = () => {
    if (embedHtml) {
      return (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '300px', // Fixed height for embeds
            bgcolor: 'background.default',
            overflow: 'hidden',
            '& iframe': {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none'
            }
          }}
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      );
    }

    if (previewUrl) {
      return (
        <CardMedia
          component="img"
          image={previewUrl}
          alt={title || 'Preview'}
          sx={{
            height: 0,
            paddingTop: '56.25%',
            objectFit: 'cover',
          }}
        />
      );
    }

    return null;
  };

  const handleVote = async (voteType) => {
    if (isVoting) return;
    
    try {
      setIsVoting(true);
      
      let userId = localStorage.getItem('userId');
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
      }

      const response = await fetch('/.netlify/functions/vote-memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memoryId: memory.id || memory._id,
          voteType,
          userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      const data = await response.json();
      
      // Update vote state based on server response
      setVoteState(prev => ({
        up: data.userVote === 'up',
        down: data.userVote === 'down'
      }));

      // Update vote count from server
      setVoteCount(data.votes);

    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  };

  // Don't render empty cards
  if (!url && !description && !title) return null;

  return (
    <Card
      elevation={1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      {renderMedia()}
      
      <CardContent>
        <Stack spacing={1}>
          {siteName && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Chip
                label={siteName}
                size="small"
                icon={getMediaIcon()}
                sx={{ alignSelf: 'flex-start' }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton 
                  size="small" 
                  onClick={() => handleVote('up')}
                  color={voteState.up ? 'primary' : 'default'}
                  disabled={isVoting}
                >
                  <ThumbUpIcon fontSize="small" />
                </IconButton>
                <Typography variant="body2" color="text.secondary">
                  {voteCount.up}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => handleVote('down')}
                  color={voteState.down ? 'error' : 'default'}
                  disabled={isVoting}
                >
                  <ThumbDownIcon fontSize="small" />
                </IconButton>
                <Typography variant="body2" color="text.secondary">
                  {voteCount.down}
                </Typography>
              </Box>
            </Box>
          )}
          {title && (
            <Link
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              color="inherit"
            >
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.2,
                  mb: 1,
                  '&:hover': {
                    color: 'primary.main',
                  }
                }}
              >
                {title}
              </Typography>
            </Link>
          )}
          {description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {description}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default MemoryCard;
