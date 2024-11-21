import React from 'react';
import { CardMedia, Box, Typography } from '@mui/material';

const ImageMemory = ({ memory }) => {
  const { metadata, content } = memory;

  return (
    <>
      <CardMedia
        component="img"
        height="200"
        image={content.fileUrl}
        alt={content.originalFilename}
        sx={{ objectFit: 'cover' }}
      />
      <Box sx={{ p: 1, bgcolor: 'rgba(0, 0, 0, 0.03)' }}>
        <Typography variant="caption" component="div" color="text.secondary">
          {metadata.filename} • {metadata.width}x{metadata.height} • {metadata.format.toUpperCase()}
        </Typography>
      </Box>
    </>
  );
};

export default ImageMemory;
