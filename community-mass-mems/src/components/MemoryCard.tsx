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

const detectDiscordMediaType = (url: string): string => {
  if (!url) return 'rich';
  
  const extension = url.split('.').pop()?.toLowerCase();
  if (!extension) return 'rich';

  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
    return 'image';
  } else if (['mp4', 'webm', 'mov'].includes(extension)) {
    return 'video';
  } else if (['mp3', 'ogg', 'wav'].includes(extension)) {
    return 'audio';
  }
  
  return 'rich';
};

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
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      if (diffInSeconds < 60) {
        return 'just now';
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
      } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
      }

      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid date';
    }
  };

  const renderContent = () => {
    const title = memory.metadata?.title || memory.url || 'No title';
    const isDiscordCdn = memory.url?.includes('cdn.discordapp.com');
    const isForbesArticle = memory.url?.includes('forbes.com');
    
    const mediaType = memory.metadata?.mediaType || (isDiscordCdn && memory.url ? detectDiscordMediaType(memory.url) : 'rich');
    const showFavicon = memory.metadata?.favicon && isValidUrl(memory.metadata.favicon) && !faviconError;

    const renderFavicon = showFavicon && (
      <img 
        src={memory.metadata?.favicon}
        alt=""
        onError={handleFaviconError}
        style={{ 
          width: 20, 
          height: 20, 
          objectFit: 'contain',
          marginRight: 8,
          flexShrink: 0,
          borderRadius: '4px'
        }} 
      />
    );

    const renderHeader = (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 1,
        gap: 1
      }}>
        {renderFavicon}
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: '1.1rem',
            fontWeight: 500,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {title}
        </Typography>
      </Box>
    );

    // Handle rich embeds (social media, etc)
    if (mediaType === 'rich' && memory.metadata?.embedHtml) {
      return (
        <>
          {renderHeader}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              ...(memory.metadata?.height && memory.metadata?.width
                ? { paddingTop: `${(memory.metadata.height / memory.metadata.width) * 100}%` }
                : { paddingTop: '56.25%' })
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
    if (mediaType === 'article' || isForbesArticle) {
      return (
        <Link 
          href={memory.url} 
          target="_blank" 
          rel="noopener noreferrer"
          sx={{ 
            textDecoration: 'none', 
            color: 'inherit',
            display: 'block',
            '&:hover': {
              textDecoration: 'none'
            }
          }}
        >
          <Card 
            variant="outlined" 
            sx={{ 
              display: 'flex', 
              flexDirection: memory.metadata?.previewUrl ? 'row' : 'column',
              '&:hover': {
                backgroundColor: 'action.hover'
              },
              borderRadius: '8px'
            }}
          >
            {memory.metadata?.previewUrl && (
              <Box sx={{ width: '30%', minWidth: '200px', position: 'relative' }}>
                <CardMedia
                  component="img"
                  sx={{ 
                    height: '100%',
                    minHeight: '160px',
                    objectFit: 'cover'
                  }}
                  image={memory.metadata.previewUrl}
                  alt={title}
                />
              </Box>
            )}
            <CardContent sx={{ flex: 1, p: 2 }}>
              {renderHeader}
              {memory.metadata?.description && (
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    mb: 1
                  }}
                >
                  {memory.metadata.description}
                </Typography>
              )}
              {memory.metadata?.siteName && (
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
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
          <Box sx={{ 
            borderRadius: '8px', 
            overflow: 'hidden',
            backgroundColor: 'action.hover',
            mb: 2
          }}>
            {mediaType === 'video' ? (
              <video
                controls
                style={{ 
                  width: '100%', 
                  maxHeight: '500px',
                  borderRadius: '8px'
                }}
                src={memory.url}
              >
                Your browser does not support the video tag.
              </video>
            ) : mediaType === 'audio' ? (
              <Box sx={{ p: 2 }}>
                <audio
                  controls
                  style={{ width: '100%' }}
                  src={memory.url}
                >
                  Your browser does not support the audio tag.
                </audio>
              </Box>
            ) : (
              <img
                src={memory.url}
                alt={title}
                style={{ 
                  width: '100%', 
                  maxHeight: '500px',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            )}
          </Box>
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
        sx={{ 
          textDecoration: 'none', 
          color: 'inherit',
          '&:hover': {
            textDecoration: 'underline'
          }
        }}
      >
        {renderHeader}
      </Link>
    );
  };

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: '12px',
        '&:hover': {
          boxShadow: 3
        },
        transition: 'box-shadow 0.2s'
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        {renderContent()}
        
        <Box sx={{ 
          mt: 2, 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1 
        }}>
          {memory.tags?.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              onClick={() => onTagClick(tag)}
              sx={{
                borderRadius: '16px',
                backgroundColor: selectedTags.includes(tag) ? 'primary.main' : 'action.selected',
                color: selectedTags.includes(tag) ? 'primary.contrastText' : 'text.primary',
                '&:hover': {
                  backgroundColor: selectedTags.includes(tag) ? 'primary.dark' : 'action.hover'
                },
                transition: 'all 0.2s'
              }}
            />
          ))}
        </Box>

        <Box sx={{ 
          mt: 2,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                size="small"
                onClick={() => handleVote('up')}
                color={userVote === 'up' ? 'primary' : 'default'}
              >
                <ThumbUpIcon fontSize="small" />
              </IconButton>
              <Typography variant="body2" sx={{ mx: 1 }}>
                {memory.votes?.up || 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                size="small"
                onClick={() => handleVote('down')}
                color={userVote === 'down' ? 'error' : 'default'}
              >
                <ThumbDownIcon fontSize="small" />
              </IconButton>
              <Typography variant="body2" sx={{ mx: 1 }}>
                {memory.votes?.down || 0}
              </Typography>
            </Box>
          </Box>
          
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {formatDate(memory.submittedAt)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MemoryCard;
