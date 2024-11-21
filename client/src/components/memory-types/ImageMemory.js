import React from 'react';
import { CardMedia, Box, Typography } from '@mui/material';

const ImageMemory = ({ memory }) => {
  const imageUrl = `/uploads/${memory.content}`;

  return (
    <>
      <CardMedia
        component="img"
        height="200"
        image={imageUrl}
        alt={memory.fileName}
        sx={{ objectFit: 'cover' }}
      />
      <Box sx={{ p: 1, bgcolor: 'rgba(0, 0, 0, 0.03)' }}>
        <Typography variant="caption" component="div" color="text.secondary">
          {memory.fileName} • {memory.dimensions} • {memory.fileFormat.toUpperCase()}
        </Typography>
      </Box>
    </>
  );
};

export default ImageMemory;
