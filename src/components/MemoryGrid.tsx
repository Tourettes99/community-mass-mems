import React, { useState, useEffect, useCallback } from 'react';
import { Box, Card, CardContent, Typography, CardMedia, CircularProgress, IconButton, CardHeader, Avatar, Link, Stack, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

interface Memory {
  _id: string;
  type: 'url' | 'image' | 'video' | 'audio' | 'text' | 'static';
  url: string;
  content?: string;
  metadata?: {
    title?: string;
    description?: string;
    siteName?: string;
    favicon?: string;
    mediaType?: 'url' | 'image' | 'video' | 'audio' | 'static';
    previewUrl?: string;
    playbackHtml?: string;
    isPlayable?: boolean;
    fileSize?: number;
    contentType?: string;
    resolution?: string;
    duration?: string;
    format?: string;
    encoding?: string;
    lastModified?: Date;
    rawContent?: string;
  };
  tags?: string[];
}

const MemoryCard: React.FC<{ memory: Memory }> = ({ memory }) => {
  const [expanded, setExpanded] = useState(false);

  const handleCardClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('video, audio, iframe, a, button')) {
      return;
    }
    setExpanded(!expanded);
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
    case 'url':
    case 'image':
    case 'video':
    case 'audio':
    case 'static':
      return renderUrlCard();
    default:
      return null;
  }
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
