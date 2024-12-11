import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Link,
  CardMedia,
  Divider,
  Typography
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PublicIcon from '@mui/icons-material/Public';
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
    const description = memory.metadata?.description;
    const author = memory.metadata?.author;
    const publishedDate = memory.metadata?.publishedDate;
    const siteName = memory.metadata?.siteName;
    const mediaType = memory.metadata?.mediaType || memory.type;
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
        flexDirection: 'column',
        gap: 1,
        mb: 2
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
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
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              width: '100%'
            }}
          >
            {title}
          </Typography>
        </Box>
        {(author || publishedDate || siteName) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
            {author && (
              <>
                <PersonIcon sx={{ fontSize: '1rem' }} />
                <Typography variant="body2">{author}</Typography>
                {(publishedDate || siteName) && <Divider orientation="vertical" flexItem />}
              </>
            )}
            {publishedDate && (
              <>
                <CalendarTodayIcon sx={{ fontSize: '1rem' }} />
                <Typography variant="body2">{new Date(publishedDate).toLocaleDateString()}</Typography>
                {siteName && <Divider orientation="vertical" flexItem />}
              </>
            )}
            {siteName && (
              <>
                <PublicIcon sx={{ fontSize: '1rem' }} />
                <Typography variant="body2">{siteName}</Typography>
              </>
            )}
          </Box>
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
              WebkitBoxOrient: 'vertical'
            }}
          >
            {description}
          </Typography>
        )}
      </Box>
    );

    const renderFooter = (
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
    );

    // Handle YouTube and other embeds first
    if (memory.metadata?.embedHtml && memory.metadata?.mediaType !== 'image') {
      return (
        <>
          {renderHeader}
          <Box sx={{ 
            position: 'relative',
            width: '100%',
            pt: '56.25%', // 16:9 aspect ratio
            bgcolor: 'background.paper',
            borderRadius: 1,
            overflow: 'hidden',
            mb: 2
          }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                }}
                dangerouslySetInnerHTML={{ 
                  __html: memory.metadata.embedHtml || '' 
                }}
              />
            </div>
          </Box>
          {renderFooter}
        </>
      );
    }

    // Handle media preview (images, GIFs, videos)
    const metadata = memory.metadata;
    if (!metadata) return renderHeader;

    const mediaUrl = metadata.previewUrl || metadata.ogImage || memory.url;
    if (!mediaUrl) return renderHeader;

    const isVideo = metadata.mediaType === 'video';
    const isGif = mediaUrl.toLowerCase().endsWith('.gif');
    const hasEmbed = metadata.embedHtml && metadata.mediaType !== 'image';

    // Use embed if available and not an image
    if (hasEmbed) {
      return (
        <>
          {renderHeader}
          <Box sx={{ 
            position: 'relative',
            width: '100%',
            pt: '56.25%', // 16:9 aspect ratio
            bgcolor: 'background.paper',
            borderRadius: 1,
            overflow: 'hidden',
            mb: 2
          }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                }}
                dangerouslySetInnerHTML={{ 
                  __html: metadata.embedHtml 
                }}
              />
            </div>
          </Box>
          {renderFooter}
        </>
      );
    }

    // Handle media content
    return (
      <>
        {renderHeader}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            pt: metadata.dimensions?.height && metadata.dimensions?.width
              ? `${(metadata.dimensions.height / metadata.dimensions.width) * 100}%`
              : '56.25%', // Default 16:9 aspect ratio
            bgcolor: 'background.paper',
            borderRadius: 1,
            overflow: 'hidden',
            mb: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {isVideo || isGif ? (
            <video
              controls={isVideo}
              loop={isGif}
              autoPlay={isGif}
              muted={isGif}
              playsInline
              src={mediaUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          ) : (
            <img
              src={mediaUrl}
              alt={metadata.title || 'Preview'}
              loading="lazy"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          )}
        </Box>
        {renderFooter}
      </>
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
      </CardContent>
    </Card>
  );
};

export default MemoryCard;
