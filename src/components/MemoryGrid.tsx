import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, CardMedia, CircularProgress, IconButton, CardHeader, Avatar, Link, Stack, Chip, Button } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { Memory } from '../types';
import EmbedPlayer from './EmbedPlayer';
import { convertToOrange, RAL_2005 } from '../utils/colorUtils';
import { useTheme } from '@mui/material/styles';

interface MemoryGridProps {
  memories: Memory[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  isBackgroundRefresh?: boolean;
}

interface MemoryCardProps {
  memory: Memory;
  onVote: (memoryId: string, vote: 1 | -1) => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onVote }) => {
  const [expanded, setExpanded] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [orangeFavicon, setOrangeFavicon] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    if (memory.metadata?.favicon) {
      convertToOrange(memory.metadata.favicon)
        .then(setOrangeFavicon)
        .catch(() => setOrangeFavicon(null));
    }
  }, [memory.metadata?.favicon]);

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

  const renderMediaContent = () => {
    if (!memory.url) return null;

    const isImage = memory.type === 'image' || memory.metadata?.contentType?.startsWith('image/');
    const isVideo = memory.type === 'video' || memory.metadata?.contentType?.startsWith('video/');
    const isAudio = memory.type === 'audio' || memory.metadata?.contentType?.startsWith('audio/');

    if (isImage && !mediaError) {
      return (
        <CardMedia
          component="img"
          image={memory.url}
          alt={memory.metadata?.title || 'Memory image'}
          onError={() => setMediaError(true)}
          sx={{
            height: 200,
            objectFit: 'cover',
          }}
        />
      );
    }

    if (isVideo || isAudio) {
      return (
        <EmbedPlayer
          url={memory.url}
          type={memory.type}
          title={memory.metadata?.title}
          metadata={memory.metadata}
        />
      );
    }

    // Fallback for other URL types or when media fails to load
    return (
      <Link
        href={memory.url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ 
          wordBreak: 'break-all',
          color: RAL_2005,
          '&:hover': {
            color: theme.palette.primary.light,
          }
        }}
      >
        {memory.metadata?.title || memory.url}
      </Link>
    );
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
      case 'image':
      case 'video':
      case 'audio':
      case 'static':
        return (
          <CardContent>
            {renderMediaContent()}
            {memory.metadata?.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 1,
                  display: expanded ? 'block' : '-webkit-box',
                  WebkitLineClamp: expanded ? 'none' : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {memory.metadata.description}
              </Typography>
            )}
            {renderMetadataDetails(memory.metadata)}
          </CardContent>
        );
      default:
        return null;
    }
  };

  return (
    <Card
      onClick={handleCardClick}
      sx={{
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: 3,
          '& .MuiCardHeader-root': {
            backgroundColor: `${RAL_2005}10`,
          }
        },
        '& .MuiCardHeader-root': {
          transition: 'background-color 0.2s ease',
        }
      }}
    >
      <CardHeader
        avatar={
          orangeFavicon ? (
            <Avatar src={orangeFavicon} />
          ) : (
            <Avatar sx={{ 
              bgcolor: `${RAL_2005}20`,
              color: RAL_2005,
            }}>
              {memory.type.charAt(0).toUpperCase()}
            </Avatar>
          )
        }
        title={memory.metadata?.title || memory.type}
        subheader={memory.metadata?.siteName}
        sx={{
          '& .MuiCardHeader-title': {
            color: theme.palette.mode === 'dark' ? '#fff' : '#666',
          },
          '& .MuiCardHeader-subheader': {
            color: theme.palette.mode === 'dark' ? '#B3B3B3' : '#808080',
          }
        }}
        action={
          <Button
            variant="contained"
            onClick={() => onVote(memory._id, 1)}
            sx={{ 
              color: RAL_2005,
              '&:hover': {
                bgcolor: `${RAL_2005}20`,
              }
            }}
          >
            Vote
          </Button>
        }
      />
      {renderCardContent()}
      {memory.tags && memory.tags.length > 0 && (
        <Box sx={{ p: 2, pt: 0, mt: 'auto' }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {memory.tags.map((tag) => (
              <Chip
                key={tag}
                size="small"
                label={tag}
                icon={<LocalOfferIcon />}
                sx={{ 
                  mt: 1,
                  bgcolor: theme.palette.mode === 'dark' 
                    ? `${RAL_2005}20` 
                    : `${RAL_2005}10`,
                  color: RAL_2005,
                  '& .MuiChip-icon': {
                    color: RAL_2005,
                  },
                  '&:hover': {
                    bgcolor: theme.palette.mode === 'dark' 
                      ? `${RAL_2005}30` 
                      : `${RAL_2005}20`,
                  }
                }}
              />
            ))}
          </Stack>
        </Box>
      )}
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
  const [voteError, setVoteError] = useState<string | null>(null);

  const handleVote = async (memoryId: string, vote: 1 | -1) => {
    try {
      const response = await fetch('/.netlify/functions/vote-memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memoryId, vote })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to vote');
      }

      await response.json();
    } catch (error) {
      setVoteError(error instanceof Error ? error.message : 'Failed to vote');
      throw error;
    }
  };

  if (loading && !isBackgroundRefresh) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
        {onRefresh && (
          <Button
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            variant="contained"
          >
            Retry
          </Button>
        )}
      </Box>
    );
  }

  if (!memories.length) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No memories found
        </Typography>
        {onRefresh && (
          <Button
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            variant="contained"
            sx={{ mt: 2 }}
          >
            Refresh
          </Button>
        )}
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 2,
          opacity: loading && !isBackgroundRefresh ? 0.5 : 1
        }}
      >
        <AnimatePresence>
          {memories.map((memory) => (
            <motion.div
              key={memory._id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <MemoryCard memory={memory} onVote={handleVote} />
            </motion.div>
          ))}
        </AnimatePresence>
      </Box>

      <Snackbar
        open={!!voteError}
        autoHideDuration={6000}
        onClose={() => setVoteError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setVoteError(null)}>
          {voteError}
        </Alert>
      </Snackbar>
    </>
  );
};

export default MemoryGrid;
