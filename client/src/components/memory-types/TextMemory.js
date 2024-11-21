import React from 'react';
import { Box, Typography } from '@mui/material';

const TextMemory = ({ memory }) => {
  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
      <Typography variant="body1">
        {memory.content.text}
      </Typography>
    </Box>
  );
};

export default TextMemory;
