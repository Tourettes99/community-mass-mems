import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, CardMedia } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
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
  };
}

const MemoryCard: React.FC<{ memory: Memory }> = ({ memory }) => {
  const [isHovered, setIsHovered] = useState(false);

  const renderContent = () => {
    switch (memory.type) {
      case 'image':
      case 'gif':
        return (
          <CardMedia
            component="img"
            image={memory.url}
            alt={memory.metadata?.fileName || 'Memory image'}
            sx={{ height: 200, objectFit: 'cover' }}
          />
        );
      case 'audio':
        return (
          <Box sx={{ p: 2 }}>
            <audio controls style={{ width: '100%' }}>
              <source src={memory.url} type={memory.metadata?.format ? `audio/${memory.metadata.format}` : 'audio/mpeg'} />
            </audio>
          </Box>
        );
      case 'url':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">{memory.metadata?.siteName || 'Website'}</Typography>
            <Typography variant="body2">{memory.metadata?.description || 'No description available'}</Typography>
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
          <Typography variant="body2">Name: {metadata.fileName}</Typography>
        )}
        {metadata.resolution && (
          <Typography variant="body2">Resolution: {metadata.resolution}</Typography>
        )}
        {metadata.format && (
          <Typography variant="body2">Format: {metadata.format}</Typography>
        )}
        {metadata.fps && (
          <Typography variant="body2">FPS: {metadata.fps}</Typography>
        )}
        {metadata.duration && (
          <Typography variant="body2">Duration: {metadata.duration}</Typography>
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
        }}
      >
        {renderContent()}
        <CardContent>
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        setError(null);
        const response = await axios.get('/api/memories');
        setMemories(response.data);
      } catch (error: any) {
        let errorMessage = 'Failed to load memories. Please try again later.';
        if (error.code === 'ERR_NETWORK') {
          errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        } else if (error.response?.status === 404) {
          errorMessage = 'The memories endpoint is currently unavailable. Our team has been notified.';
        }
        setError(errorMessage);
        console.error('Failed to fetch memories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMemories();
    const interval = setInterval(fetchMemories, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography variant="h6">Loading memories...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        gap: 2,
        p: 3,
        textAlign: 'center'
      }}>
        <Typography variant="h6" color="error">
          {error}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          We're working on fixing this issue. Please check back in a few minutes.
        </Typography>
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
      }}
    >
      <AnimatePresence>
        {memories.map((memory) => (
          <motion.div
            key={memory._id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            layout
          >
            <MemoryCard memory={memory} />
          </motion.div>
        ))}
      </AnimatePresence>
    </Box>
  );
};

export default MemoryGrid;
