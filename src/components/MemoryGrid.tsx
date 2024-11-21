import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, CardMedia, CircularProgress, IconButton, CardHeader, Avatar, Link, Stack, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Memory } from '../types';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import EmbedPlayer from './EmbedPlayer';

interface MemoryGridProps {
  memories: Memory[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  isBackgroundRefresh?: boolean;
}

const MemoryCard: React.FC<{ memory: Memory }> = ({ memory }) => {
  const [expanded, setExpanded] = useState(false);

  const handleCardClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('video, audio, iframe, a, button')) {
      return;
    }
    setExpanded(!expanded);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const renderMetadataDetails = (metadata: Memory['metadata']) => {
    if (!metadata) return null;

    const details = [];

    if (metadata.fileSize) {
      details.push(`Size: ${formatFileSize(metadata.fileSize)}`);
    }
    if (metadata.contentType) {
      details.push(`Type: ${metadata.contentType}`);
    }
    if (metadata.resolution) {
      details.push(`Resolution: ${metadata.resolution}`);
    }
    if (metadata.duration) {
      details.push(`Duration: ${metadata.duration}`);
    }
    if (metadata.format) {
      details.push(`Format: ${metadata.format}`);
    }
    if (metadata.encoding) {
      details.push(`Encoding: ${metadata.encoding}`);
    }

    return details.length > 0 ? (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {details.join(' • ')}
      </Typography>
    ) : null;
  };

  const renderCardContent = () => {
    switch (memory.type) {
      case 'text':
        return (
          <CardContent>
            <Typography
              variant="body1"
              sx={{
                display: expanded ? 'block' : '-webkit-box',
                WebkitLineClamp: expanded ? 'none' : 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {memory.content}
            </Typography>
          </CardContent>
        );
      case 'url':
        return (
          <>
            {memory.url && (
              <Box sx={{ width: '100%' }}>
                <EmbedPlayer
                  type={memory.type}
                  url={memory.url}
                  title={memory.metadata?.title}
                  metadata={memory.metadata}
                />
              </Box>
            )}
            <CardContent>
              {memory.metadata?.description && (
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{
                    display: expanded ? 'block' : '-webkit-box',
                    WebkitLineClamp: expanded ? 'none' : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {memory.metadata.description}
                </Typography>
              )}
              {renderMetadataDetails(memory.metadata)}
            </CardContent>
          </>
        );
      case 'video':
      case 'audio':
        return (
          <>
            {memory.url && (
              <Box sx={{ width: '100%' }}>
                <EmbedPlayer
                  type={memory.type}
                  url={memory.url}
                  title={memory.metadata?.title}
                  metadata={memory.metadata}
                />
              </Box>
            )}
            <CardContent>
              {memory.metadata?.description && (
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{
                    display: expanded ? 'block' : '-webkit-box',
                    WebkitLineClamp: expanded ? 'none' : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {memory.metadata.description}
                </Typography>
              )}
              {renderMetadataDetails(memory.metadata)}
            </CardContent>
          </>
        );
      case 'image':
        return (
          <>
            {memory.url && (
              <CardMedia
                component="img"
                image={memory.url}
                alt={memory.metadata?.title || 'Image'}
                sx={{ 
                  objectFit: 'contain',
                  maxHeight: expanded ? 'none' : '200px',
                  transition: 'max-height 0.3s ease'
                }}
              />
            )}
            <CardContent>
              {memory.metadata?.description && (
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{
                    display: expanded ? 'block' : '-webkit-box',
                    WebkitLineClamp: expanded ? 'none' : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {memory.metadata.description}
                </Typography>
              )}
              {renderMetadataDetails(memory.metadata)}
            </CardContent>
          </>
        );
      default:
        return (
          <CardContent>
            <Typography color="error">
              Unsupported memory type: {memory.type}
            </Typography>
            <Typography variant="caption" component="pre" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(memory, null, 2)}
            </Typography>
          </CardContent>
        );
    }
  };

  return (
    <Card 
      component={motion.div}
      layout
      onClick={handleCardClick}
      sx={{ 
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '&:hover': {
          boxShadow: 6,
        }
      }}
    >
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: '#FF4D06' }}>
            {memory.type.charAt(0).toUpperCase()}
          </Avatar>
        }
        title={memory.metadata?.title || 'Untitled Memory'}
        subheader={formatDate(memory.createdAt)}
      />
      {renderCardContent()}
      <CardContent>
        {memory.tags && memory.tags.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1, gap: 1 }}>
            {memory.tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                icon={<LocalOfferIcon />}
                sx={{
                  bgcolor: 'rgba(255, 77, 6, 0.1)',
                  color: '#FF4D06',
                  '& .MuiChip-icon': {
                    color: '#FF4D06'
                  }
                }}
              />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

const MemoryGrid: React.FC<MemoryGridProps> = ({ 
  memories = [], 
  loading = false, 
  error = null, 
  onRefresh,
  isBackgroundRefresh = false 
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Extract unique tags from memories
  useEffect(() => {
    const tags = new Set<string>();
    memories.forEach(memory => {
      memory.tags?.forEach(tag => tags.add(tag));
    });
    setAvailableTags(Array.from(tags));
  }, [memories]);

  // Filter memories based on selected tags
  const filteredMemories = memories.filter(memory => {
    if (selectedTags.length === 0) return true;
    return memory.tags?.some(tag => selectedTags.includes(tag));
  });

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {availableTags.length > 0 && (
        <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {availableTags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              icon={<LocalOfferIcon />}
              onClick={() => handleTagClick(tag)}
              color={selectedTags.includes(tag) ? 'primary' : 'default'}
              sx={{
                bgcolor: selectedTags.includes(tag) 
                  ? '#FF4D06' 
                  : 'rgba(255, 77, 6, 0.1)',
                color: selectedTags.includes(tag) 
                  ? 'white' 
                  : '#FF4D06',
                '& .MuiChip-icon': {
                  color: selectedTags.includes(tag) 
                    ? 'white' 
                    : '#FF4D06'
                }
              }}
            />
          ))}
        </Box>
      )}
      
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          Error: {error}
        </Typography>
      )}

      {loading && !isBackgroundRefresh && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress sx={{ color: '#FF4D06' }} />
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)'
          },
          gap: 3
        }}
      >
        <AnimatePresence>
          {filteredMemories.map((memory) => (
            <motion.div
              key={memory._id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <MemoryCard memory={memory} />
            </motion.div>
          ))}
        </AnimatePresence>
      </Box>

      {onRefresh && (
        <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
          <IconButton
            onClick={onRefresh}
            sx={{
              bgcolor: '#FF4D06',
              color: 'white',
              '&:hover': {
                bgcolor: '#FF6B06'
              },
              ...(isBackgroundRefresh && {
                animation: 'spin 1s linear infinite',
                '@keyframes spin': {
                  '0%': {
                    transform: 'rotate(0deg)',
                  },
                  '100%': {
                    transform: 'rotate(360deg)',
                  },
                },
              }),
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default MemoryGrid;
