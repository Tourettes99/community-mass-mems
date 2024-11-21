import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, CardMedia, CircularProgress, IconButton, CardHeader, Avatar, Link, Stack, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Memory } from '../types';

interface MemoryGridProps {
  memories: Memory[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
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
    if (metadata.lastModified) {
      details.push(`Modified: ${new Date(metadata.lastModified).toLocaleString()}`);
    }

    if (details.length === 0) return null;

    return (
      <Box sx={{ mt: 1, mb: 1 }}>
        <Typography variant="caption" color="text.secondary" component="div">
          {details.join(' • ')}
        </Typography>
      </Box>
    );
  };

  const renderTextCard = () => {
    return (
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          cursor: 'pointer',
          '&:hover': {
            boxShadow: 3,
          },
        }}
        onClick={handleCardClick}
      >
        <CardContent>
          <Typography
            variant="body1"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {memory.content}
          </Typography>
          
          {/* Metadata */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Posted on {formatDate(memory.createdAt)}
            </Typography>
          </Box>

          {/* Tags */}
          {memory.tags && memory.tags.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
              {memory.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  sx={{ borderRadius: 1 }}
                  onClick={(e) => e.stopPropagation()}
                />
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderUrlCard = () => {
    const metadata = memory.metadata;
    if (!metadata) return null;

    return (
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          cursor: 'pointer',
          '&:hover': {
            boxShadow: 3,
          },
        }}
        onClick={handleCardClick}
      >
        {/* Header with favicon and title */}
        <CardHeader
          avatar={
            metadata.favicon ? (
              <Avatar 
                src={metadata.favicon} 
                sx={{ width: 24, height: 24 }}
                imgProps={{ style: { objectFit: 'contain' } }}
              />
            ) : null
          }
          title={
            <Link
              href={memory.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              sx={{
                color: 'inherit',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {metadata.title || memory.url}
            </Link>
          }
          subheader={metadata.siteName}
        />

        {/* File Metadata */}
        {renderMetadataDetails(metadata)}

        {/* Media Content */}
        {metadata.isPlayable && metadata.playbackHtml ? (
          <Box 
            sx={{ 
              width: '100%',
              position: 'relative',
              paddingTop: metadata.mediaType === 'video' ? '56.25%' : 'auto',
              '& iframe': {
                position: metadata.mediaType === 'video' ? 'absolute' : 'relative',
                top: 0,
                left: 0,
                width: '100%',
                height: metadata.mediaType === 'video' ? '100%' : 'auto',
                border: 'none',
                borderRadius: 1,
              },
              '& video, & audio': {
                width: '100%',
                borderRadius: 1,
              },
            }}
            dangerouslySetInnerHTML={{ __html: metadata.playbackHtml }}
          />
        ) : metadata.previewUrl ? (
          <CardMedia
            component="img"
            image={metadata.previewUrl}
            alt={metadata.title || "Preview"}
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: '300px',
              objectFit: 'cover',
            }}
          />
        ) : null}

        {/* Description or Raw Content */}
        {(metadata.description || metadata.rawContent) && (
          <CardContent>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: expanded ? 'unset' : 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                ...(metadata.rawContent && {
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.75rem'
                })
              }}
            >
              {metadata.rawContent || metadata.description}
            </Typography>
          </CardContent>
        )}

        {/* Tags */}
        {memory.tags && memory.tags.length > 0 && (
          <CardContent sx={{ pt: 0 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {memory.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  sx={{ borderRadius: 1 }}
                  onClick={(e) => e.stopPropagation()}
                />
              ))}
            </Stack>
          </CardContent>
        )}
      </Card>
    );
  };

  // Render different card types based on memory type
  switch (memory.type) {
    case 'text':
      return renderTextCard();
    case 'url':
    case 'image':
    case 'video':
    case 'audio':
    case 'static':
      return renderUrlCard();
    default:
      console.warn(`Unknown memory type: ${memory.type}`, memory);
      return (
        <Card>
          <CardContent>
            <Typography color="error">
              Unsupported memory type: {memory.type}
            </Typography>
            <Typography variant="caption" component="pre" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(memory, null, 2)}
            </Typography>
          </CardContent>
        </Card>
      );
  }
};

const MemoryGrid: React.FC<MemoryGridProps> = ({ memories = [], loading = false, error = null, onRefresh }) => {
  const [sortedMemories, setSortedMemories] = useState<Memory[]>([]);

  useEffect(() => {
    // Ensure memories is an array and sort by creation date
    const validMemories = Array.isArray(memories) ? memories : [];
    const sorted = [...validMemories].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    setSortedMemories(sorted);
  }, [memories]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
        {onRefresh && (
          <IconButton onClick={onRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        )}
      </Box>
    );
  }

  if (!sortedMemories.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="textSecondary">
          No memories found. Create one by using the upload bar above!
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <AnimatePresence>
        {sortedMemories.map((memory, index) => (
          <motion.div
            key={memory._id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Box sx={{ mb: 2 }}>
              <MemoryCard memory={memory} />
            </Box>
          </motion.div>
        ))}
      </AnimatePresence>
    </Box>
  );
};

export default MemoryGrid;
