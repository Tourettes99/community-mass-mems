import React, { useState, useEffect, useCallback } from 'react';
import { Box, Card, CardContent, Typography, CardMedia, CircularProgress, IconButton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

interface Memory {
  _id: string;
  type: 'image' | 'gif' | 'audio' | 'url';
  url: string;
  metadata: {
    fileName?: string;
    resolution?: string;
    format?: string;
    fps?: number;
    duration?: string;
    siteName?: string;
    description?: string;
    size?: number;
    contentType?: string;
    embedHtml?: string;
    previewUrl?: string;
    isPlayable?: boolean;
    mediaType?: string;
    favicon?: string;
  };
}

const MemoryCard: React.FC<{ memory: Memory }> = ({ memory }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleImageLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError('Failed to load image');
  };

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setRetryCount(count => count + 1);
  }, []);

  const renderContent = () => {
    switch (memory.type) {
      case 'image':
      case 'gif':
        return (
          <Box sx={{ position: 'relative', height: 200 }}>
            {isLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'background.default',
                }}
              >
                <CircularProgress size={24} />
              </Box>
            )}
            {error ? (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'error.light',
                  color: 'error.contrastText',
                  gap: 1,
                  p: 2,
                }}
              >
                <Typography variant="body2" align="center">
                  {error}
                </Typography>
                <IconButton 
                  onClick={handleRetry}
                  size="small"
                  sx={{ 
                    color: 'inherit',
                    '&:hover': {
                      bgcolor: 'error.dark',
                    }
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
            ) : (
              <CardMedia
                component="img"
                image={`${memory.url}${retryCount > 0 ? '?retry=' + retryCount : ''}`}
                alt={memory.metadata?.fileName || 'Memory image'}
                sx={{
                  height: '100%',
                  objectFit: 'cover',
                  opacity: isLoading ? 0 : 1,
                  transition: 'opacity 0.3s ease-in-out',
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
          </Box>
        );
      case 'audio':
        return (
          <Box sx={{ p: 2 }}>
            <audio 
              controls 
              style={{ width: '100%' }}
              onError={() => setError('Failed to load audio')}
            >
              <source 
                src={memory.url} 
                type={memory.metadata?.contentType || memory.metadata?.format ? `audio/${memory.metadata.format}` : 'audio/mpeg'} 
              />
              Your browser does not support the audio element.
            </audio>
          </Box>
        );
      case 'url':
        const { metadata } = memory;
        const hasEmbed = metadata?.embedHtml;
        const hasPreviewImage = metadata?.previewUrl;
        const hasPlayableMedia = metadata?.isPlayable;
        const siteIcon = metadata?.favicon || `https://www.google.com/s2/favicons?domain=${new URL(memory.url).hostname}`;

        return (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                component="img"
                src={siteIcon}
                alt="Site Icon"
                sx={{
                  width: 16,
                  height: 16,
                  mr: 1,
                  borderRadius: '2px'
                }}
              />
              <Typography 
                variant="h6" 
                noWrap 
                sx={{ 
                  flex: 1,
                  fontSize: '1rem',
                  fontWeight: 500
                }}
              >
                {metadata?.siteName || new URL(memory.url).hostname}
              </Typography>
            </Box>

            {hasEmbed ? (
              <Box 
                component="div"
                sx={{ 
                  position: 'relative',
                  paddingTop: '56.25%', // 16:9 aspect ratio
                  mb: 2,
                  overflow: 'hidden',
                  borderRadius: 1
                }}
              >
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: metadata.embedHtml || '' 
                  }} 
                />
              </Box>
            ) : hasPlayableMedia ? (
              <Box sx={{ mb: 2 }}>
                {metadata.mediaType === 'video' ? (
                  <video 
                    controls
                    style={{ 
                      width: '100%',
                      borderRadius: '4px'
                    }}
                  >
                    <source src={memory.url} type={metadata.contentType} />
                    Your browser does not support video playback.
                  </video>
                ) : metadata.mediaType === 'audio' ? (
                  <audio 
                    controls
                    style={{ width: '100%' }}
                  >
                    <source src={memory.url} type={metadata.contentType} />
                    Your browser does not support audio playback.
                  </audio>
                ) : null}
              </Box>
            ) : hasPreviewImage ? (
              <Box 
                sx={{ 
                  mb: 2,
                  borderRadius: 1,
                  overflow: 'hidden'
                }}
              >
                <CardMedia
                  component="img"
                  image={metadata.previewUrl}
                  alt={metadata.siteName || "Preview"}
                  sx={{
                    width: '100%',
                    aspectRatio: '16/9',
                    objectFit: 'cover'
                  }}
                />
              </Box>
            ) : metadata?.description ? (
              <Typography 
                variant="body2" 
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  mb: 2,
                  color: 'text.secondary'
                }}
              >
                {metadata.description}
              </Typography>
            ) : null}

            <Typography 
              variant="body2" 
              component="a" 
              href={memory.url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              Visit Website
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  const renderMetadata = () => {
    const { metadata } = memory;
    if (!metadata) return null;
    
    return (
      <Box sx={{ mt: 1 }}>
        {metadata.fileName && (
          <Typography variant="body2" noWrap>
            Name: {metadata.fileName}
          </Typography>
        )}
        {metadata.format && (
          <Typography variant="body2">
            Format: {metadata.format}
          </Typography>
        )}
        {metadata.size && (
          <Typography variant="body2">
            Size: {(metadata.size / 1024).toFixed(1)} KB
          </Typography>
        )}
        {metadata.resolution && (
          <Typography variant="body2">
            Resolution: {metadata.resolution}
          </Typography>
        )}
        {metadata.fps && (
          <Typography variant="body2">
            FPS: {metadata.fps}
          </Typography>
        )}
        {metadata.duration && (
          <Typography variant="body2">
            Duration: {metadata.duration}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.05 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        {renderContent()}
        <CardContent sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {renderMetadata()}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const MemoryGrid: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/memories');
      setMemories(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load memories');
      console.error('Error fetching memories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        sx={{ 
          p: 4, 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Typography color="error">{error}</Typography>
        <IconButton 
          onClick={fetchMemories}
          color="primary"
        >
          <RefreshIcon />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
        gap: 3,
        p: 3,
      }}
    >
      {memories.map((memory) => (
        <MemoryCard key={memory._id} memory={memory} />
      ))}
    </Box>
  );
};

export default MemoryGrid;
