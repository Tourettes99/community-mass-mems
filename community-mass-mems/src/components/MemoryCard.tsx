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
  Tooltip
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Memory } from '../types/Memory';
import useMemoryStore from '../stores/memoryStore';

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
  const [showFavicon, setShowFavicon] = React.useState(true);

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
    setShowFavicon(false);
  };

  const shouldShowFavicon = memory.metadata?.favicon && 
    isValidUrl(memory.metadata?.favicon) && 
    !faviconError;

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
    const favicon = memory.metadata?.favicon;
    const title = memory.metadata?.title || memory.url || 'No title';

    const renderFavicon = showFavicon && favicon && (
      <img 
        src={favicon}
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

    const renderTitle = (
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {renderFavicon}
        <Typography variant="subtitle1">
          {title}
        </Typography>
      </Box>
    );

    if (!memory.url) {
      return (
        <>
          {renderTitle}
          <Typography variant="body1" color="text.secondary">
            {memory.content || 'No content available'}
          </Typography>
        </>
      );
    }

    // Handle YouTube videos
    const isYouTube = memory.url.includes('youtube.com') || memory.url.includes('youtu.be');
    if (isYouTube) {
      const videoId = memory.url.includes('youtube.com') 
        ? memory.url.split('v=')[1]?.split('&')[0]
        : memory.url.split('youtu.be/')[1]?.split('?')[0];
        
      if (videoId) {
        return (
          <>
            {renderTitle}
            <Box sx={{ position: 'relative', paddingTop: '56.25%', width: '100%' }}>
              <iframe
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                src={`https://www.youtube.com/embed/${videoId}`}
                title={memory.metadata?.title ?? 'YouTube video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </Box>
          </>
        );
      }
    }

    // Handle direct file links
    const isDirectFile = /\.(jpeg|jpg|gif|png|webp)$/i.test(memory.url);
    if (isDirectFile) {
      return (
        <>
          {renderTitle}
          <Box 
            component="img"
            src={memory.url}
            alt={memory.metadata?.title ?? 'Image'}
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: '300px',
              objectFit: 'contain',
              borderRadius: 1
            }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.src = memory.metadata?.ogImage ?? memory.metadata?.twitterImage ?? '/placeholder.png';
            }}
          />
        </>
      );
    }

    // Handle other URLs with thumbnails
    const thumbnail = memory.metadata?.ogImage ?? memory.metadata?.twitterImage;
    if (thumbnail) {
      return (
        <>
          {renderTitle}
          <Box
            component="a"
            href={memory.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ 
              display: 'block',
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            <Box
              component="img"
              src={thumbnail}
              alt={memory.metadata?.title ?? 'Thumbnail'}
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: '300px',
                objectFit: 'contain',
                borderRadius: 1
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.src = '/placeholder.png';
              }}
            />
            <Typography variant="body2" sx={{ mt: 1 }}>
              {memory.metadata?.title ?? memory.url}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {memory.metadata?.description ?? 'No description available'}
            </Typography>
          </Box>
        </>
      );
    }

    // Fallback for other content
    return (
      <>
        {renderTitle}
        <Box
          component="a"
          href={memory.url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ 
            display: 'block',
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <Typography variant="body1">
            {memory.metadata?.title ?? memory.url}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {memory.metadata?.description ?? 'No description available'}
          </Typography>
        </Box>
      </>
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
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={() => handleVote('up')}
            color={userVote === 'up' ? 'primary' : 'default'}
          >
            <ThumbUpIcon />
          </IconButton>
          <Typography>{memory.votes.up}</Typography>
          <IconButton
            onClick={() => handleVote('down')}
            color={userVote === 'down' ? 'primary' : 'default'}
          >
            <ThumbDownIcon />
          </IconButton>
          <Typography>{memory.votes.down}</Typography>
        </Box>
      </CardActions>
    </Card>
  );
};

export default MemoryCard;
