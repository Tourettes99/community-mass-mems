import React from 'react';
import { Box, Typography } from '@mui/material';

const TextMemory = ({ memory }) => {
  // Add null check for memory and memory.content
  if (!memory || !memory.content) {
    return (
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Typography variant="body1" color="text.secondary">
          No content available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
      <Typography variant="body1">
        {memory.content.text || 'No text content'}
      </Typography>
    </Box>
  );
};

export default TextMemory;
