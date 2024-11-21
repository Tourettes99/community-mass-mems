import React from 'react';
import { Box, Typography } from '@mui/material';

const TextMemory = ({ memory }) => {
  // Add null check for memory
  if (!memory) {
    return (
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Typography variant="body1" color="text.secondary">
          No memory available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
      <Typography variant="body1">
        {memory.content || 'No text content'}
      </Typography>
    </Box>
  );
};

export default TextMemory;
