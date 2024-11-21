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
            alt={memory.metadata.fileName}
            sx={{ height: 200, objectFit: 'cover' }}
          />
        );
      case 'audio':
        return (
          <Box sx={{ p: 2 }}>
            <audio controls style={{ width: '100%' }}>
              <source src={memory.url} type={`audio/${memory.metadata.format}`} />
            </audio>
          </Box>
        );
      case 'url':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">{memory.metadata.siteName}</Typography>
            <Typography variant="body2">{memory.metadata.description}</Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  const renderMetadata = () => {
    const { metadata } = memory;
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

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/memories`);
        setMemories(response.data);
      } catch (error) {
        console.error('Failed to fetch memories:', error);
      }
    };

    fetchMemories();
    const interval = setInterval(fetchMemories, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

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
