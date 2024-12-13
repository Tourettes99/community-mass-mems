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
    votes = { up: 0, down: 0 },
    tags = []
  } = memory;

  const {
    title,
    description,
    siteName,
    previewUrl,
    embedHtml,
    previewType,
    mediaType,
    favicon,
    author,
    publishedDate,
    ogImage
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
    if (!metadata) return null;

    switch (metadata.mediaType) {
      case 'video':
        return (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              paddingTop: '56.25%', // 16:9 aspect ratio
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
            dangerouslySetInnerHTML={{ __html: metadata.embedHtml }}
          />
        );

      case 'image':
        return (
          <CardMedia
            component="img"
            image={metadata.previewUrl || metadata.ogImage}
            alt={metadata.title || 'Image'}
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: '400px',
              objectFit: 'contain',
            }}
          />
        );

      case 'audio':
        return (
          <Box sx={{ width: '100%', p: 2 }}>
            <audio controls style={{ width: '100%' }}>
              <source src={url} type="audio/mpeg" />
              <source src={url} type="audio/wav" />
              Your browser does not support the audio element.
            </audio>
          </Box>
        );

      case 'article':
        return metadata.previewUrl || metadata.ogImage ? (
          <CardMedia
            component="img"
            image={metadata.previewUrl || metadata.ogImage}
            alt={metadata.title || 'Article preview'}
            sx={{
              width: '100%',
              height: '200px',
              objectFit: 'cover',
            }}
          />
        ) : null;

      case 'rich':
        if (metadata.embedHtml) {
          return (
            <Box
              sx={{
                width: '100%',
                overflow: 'hidden',
                '& iframe': {
                  border: 'none',
                  width: '100%',
                  minHeight: '200px'
                }
              }}
              dangerouslySetInnerHTML={{ __html: metadata.embedHtml }}
            />
          );
        }
        return null;

      default:
        return null;
    }
  };

  const renderContent = () => {
    return (
      <Box sx={{ p: 2 }}>
        {/* Header with favicon and title */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          {metadata?.favicon && (
            <img 
              src={metadata.favicon} 
              alt=""
              style={{ width: 20, height: 20, objectFit: 'contain' }}
            />
          )}
          <Typography variant="h6" component="h2">
            {metadata?.title || url}
          </Typography>
        </Box>

        {/* Author, date, and site info */}
        {(metadata?.author || metadata?.publishedDate || metadata?.siteName) && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
            {metadata.author && (
              <Typography variant="body2">
                By {metadata.author}
              </Typography>
            )}
            {metadata.publishedDate && (
              <Typography variant="body2">
                {new Date(metadata.publishedDate).toLocaleDateString()}
              </Typography>
            )}
            {metadata.siteName && (
              <Typography variant="body2">
                {metadata.siteName}
              </Typography>
            )}
          </Box>
        )}

        {/* Description */}
        {metadata?.description && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {metadata.description}
          </Typography>
        )}

        {/* Media content */}
        {renderMedia()}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {tags.map((tag) => (
              <Chip 
                key={tag} 
                label={tag} 
                size="small" 
                sx={{ bgcolor: 'background.default' }}
              />
            ))}
          </Box>
        )}
      </Box>
    );
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
      {/* Make the entire card clickable */}
      <CardActionArea 
        component={Link}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {renderContent()}
      </CardActionArea>

      {/* Footer with voting */}
      <Box sx={{ 
        p: 2, 
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.preventDefault();
              handleVote('up');
            }}
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
            onClick={(e) => {
              e.preventDefault();
              handleVote('down');
            }}
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
    </Card>
  );
};

export default MemoryCard;
