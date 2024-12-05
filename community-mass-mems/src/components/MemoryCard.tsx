import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Link,
  CardMedia
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { Memory } from '../types/Memory';
import useMemoryStore from '../stores/memoryStore';
import EmbedPlayer from './EmbedPlayer';

interface MemoryCardProps {
  memory: Memory;
  selectedTags: string[];
  onTagClick: (tag: string) => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, selectedTags, onTagClick }) => {
  const updateMemory = useMemoryStore(state => state.updateMemory);
  const [userVote, setUserVote] = React.useState<string | null>(
    localStorage.getItem(`vote_${memory.id || memory._id}`)
  );
  const [faviconError, setFaviconError] = React.useState(false);

  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleFaviconError = () => {
    setFaviconError(true);
  };

  const handleVote = async (type: 'up' | 'down') => {
    try {
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
          voteType: type,
          userId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to vote');
      }

      const result = await response.json();
      const { votes, userVote, userVotes } = result;
      
      if (userVote) {
        localStorage.setItem(`vote_${memory.id || memory._id}`, userVote);
      } else {
        localStorage.removeItem(`vote_${memory.id || memory._id}`);
      }
      
      setUserVote(userVote);
      
      // Create updated memory with new votes while preserving all other properties
      const updatedMemory: Memory = {
        ...memory,
        id: memory.id || memory._id, // Ensure we have a consistent ID
        votes: { ...votes },
        userVotes: new Map(Object.entries(userVotes || {}))
      };

      // Update the memory in the store
      updateMemory(updatedMemory);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date available';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid date';
      }

      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid date';
    }
  };

  const renderContent = () => {
    const title = memory.metadata?.title || memory.url || 'No title';
    const showFavicon = memory.metadata?.favicon && 
      isValidUrl(memory.metadata.favicon) && 
      !faviconError;

    const renderFavicon = showFavicon && (
      <img 
        src={memory.metadata?.favicon}
        alt=""
        onError={handleFaviconError}
        style={{ 
          width: 16, 
          height: 16, 
          objectFit: 'contain',
          marginRight: 8,
          flexShrink: 0
        }} 
      />
    );

    const renderHeader = (
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {renderFavicon}
        <Typography variant="subtitle1">
          {title}
        </Typography>
      </Box>
    );

    const mediaType = memory.metadata?.mediaType || 'rich';

    // Handle rich embeds (social media, etc)
    if (mediaType === 'rich' && memory.metadata?.embedHtml) {
      return (
        <>
          {renderHeader}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              ...(memory.metadata?.height && memory.metadata?.width
                ? { paddingTop: `${(memory.metadata.height / memory.metadata.width) * 100}%` }
                : { paddingTop: '56.25%' }) // Default 16:9 ratio
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                '& iframe': {
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }
              }}
              dangerouslySetInnerHTML={{ __html: memory.metadata?.embedHtml || '' }}
            />
          </Box>
        </>
      );
    }

    // Handle article-type content
    if (mediaType === 'article') {
      return (
        <Link 
          href={memory.url} 
          target="_blank" 
          rel="noopener noreferrer"
          sx={{ 
            textDecoration: 'none', 
            color: 'inherit',
            '&:hover': {
              textDecoration: 'none'
            }
          }}
        >
          <Card 
            variant="outlined" 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            {memory.metadata?.previewUrl && (
              <CardMedia
                component="img"
                height="200"
                image={memory.metadata.previewUrl}
                alt={title}
                sx={{ objectFit: 'cover' }}
              />
            )}
            <CardContent sx={{ flex: 1 }}>
              {renderHeader}
              {memory.metadata?.description && (
                <Typography variant="body2" color="text.secondary">
                  {memory.metadata.description}
                </Typography>
              )}
              {memory.metadata?.siteName && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {memory.metadata.siteName}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Link>
      );
    }

    // Handle media content (images, videos, audio)
    if (['image', 'video', 'audio'].includes(mediaType)) {
      return (
        <>
          {renderHeader}
          {mediaType === 'video' ? (
            <video
              controls
              style={{ width: '100%', maxHeight: '400px' }}
              src={memory.url}
            >
              Your browser does not support the video tag.
            </video>
          ) : mediaType === 'audio' ? (
            <audio
              controls
              style={{ width: '100%' }}
              src={memory.url}
            >
              Your browser does not support the audio tag.
            </audio>
          ) : (
            <img
              src={memory.url}
              alt={title}
              style={{ 
                width: '100%', 
                maxHeight: '400px',
                objectFit: 'contain' 
              }}
            />
          )}
          {memory.metadata?.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {memory.metadata.description}
            </Typography>
          )}
        </>
      );
    }

    // Fallback for unknown types
    return (
      <Link 
        href={memory.url} 
        target="_blank" 
        rel="noopener noreferrer"
        sx={{ textDecoration: 'none', color: 'inherit' }}
      >
        {renderHeader}
      </Link>
    );
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {renderContent()}
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {memory.tags?.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 87, 34, 0.1)',
                color: '#ff5722',
                '&:hover': {
                  backgroundColor: 'rgba(255, 87, 34, 0.2)',
                },
              }}
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Created: {formatDate(memory.metadata?.createdAt)}
        </Typography>
      </CardContent>
      <Box sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={() => handleVote('up')}
            color={userVote === 'up' ? 'primary' : 'default'}
          >
            <ThumbUpIcon />
          </IconButton>
          <Typography>{memory.votes?.up || 0}</Typography>
          <IconButton
            onClick={() => handleVote('down')}
            color={userVote === 'down' ? 'primary' : 'default'}
          >
            <ThumbDownIcon />
          </IconButton>
          <Typography>{memory.votes?.down || 0}</Typography>
        </Box>
      </Box>
    </Card>
  );
};

export default MemoryCard;
