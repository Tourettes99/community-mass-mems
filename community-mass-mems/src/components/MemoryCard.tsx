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
    const isDiscordCdn = memory.url?.includes('cdn.discordapp.com') || memory.url?.includes('media.discordapp.net');
    const isForbesArticle = memory.url?.includes('forbes.com');
    
    // Determine media type
    const mediaType = memory.metadata?.mediaType || (isDiscordCdn ? detectDiscordMediaType(memory.url || '') : memory.type) || 'rich';
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
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            width: '100%'
          }}
        >
          {title}
        </Typography>
      </Box>
    );

    // Handle Discord CDN content
    if (isDiscordCdn && memory.url) {
      const fileExtension = memory.url.split('.').pop()?.split('?')[0]?.toLowerCase();
      const exParam = new URLSearchParams(memory.url.split('?')[1]).get('ex');
      const isExpired = exParam && (parseInt(exParam, 16) * 1000 < Date.now());
      
      if (isExpired) {
        return (
          <>
            {renderHeader}
            <Box sx={{ 
              width: '100%', 
              minHeight: '100px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.paper',
              color: 'text.secondary',
              borderRadius: 1,
              p: 2,
              textAlign: 'center'
            }}>
              This content has expired. Please contact an administrator to refresh it.
            </Box>
          </>
        );
      }

      // Handle images
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
        return (
          <>
            {renderHeader}
            <Box sx={{ 
              width: '100%',
              bgcolor: 'background.paper',
              borderRadius: 1,
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <img
                src={memory.url}
                alt={title}
                style={{ 
                  width: '100%',
                  height: 'auto',
                  maxHeight: '300px',
                  objectFit: 'contain'
                }}
                loading="lazy"
              />
            </Box>
          </>
        );
      }

      // Handle videos
      if (['mp4', 'webm', 'mov'].includes(fileExtension || '')) {
        return (
          <>
            {renderHeader}
            <Box sx={{ 
              position: 'relative',
              width: '100%',
              pt: '56.25%',
              bgcolor: 'background.paper',
              borderRadius: 1,
              overflow: 'hidden',
              maxHeight: '300px'
            }}>
              <video
                controls
                preload="metadata"
                playsInline
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: '#000',
                  maxHeight: '300px'
                }}
              >
                <source src={memory.url} type={`video/${fileExtension}`} />
                Your browser does not support the video tag.
              </video>
            </Box>
          </>
        );
      }
    }

    // Handle YouTube/Vimeo videos
    if (memory.metadata?.embedHtml && ['video', 'rich'].includes(mediaType)) {
      return (
        <>
          {renderHeader}
          <Box sx={{ 
            position: 'relative',
            width: '100%',
            pt: memory.metadata?.height && memory.metadata?.width 
              ? `${(memory.metadata.height / memory.metadata.width) * 100}%` 
              : '56.25%',
            bgcolor: 'background.paper',
            borderRadius: 1,
            overflow: 'hidden'
          }}>
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
              dangerouslySetInnerHTML={{ __html: memory.metadata.embedHtml }}
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
              borderRadius: '8px',
              maxWidth: '400px'
            }}
          >
            {memory.metadata?.previewUrl && (
              <Box sx={{ width: '120px', position: 'relative' }}>
                <CardMedia
                  component="img"
                  sx={{ 
                    height: '100px',
                    objectFit: 'cover'
                  }}
                  image={memory.metadata.previewUrl}
                  alt={title}
                />
              </Box>
            )}
            <CardContent sx={{ flex: 1, p: 1.5 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 0.5,
                gap: 0.5
              }}>
                {renderFavicon}
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {title}
                </Typography>
              </Box>
              {memory.metadata?.description && (
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{
                    fontSize: '0.8rem',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    mb: 0.5
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
                    gap: 0.5,
                    fontSize: '0.75rem'
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
