import React from 'react';
import { Box, CardMedia, Typography, Link } from '@mui/material';
import { Launch } from '@mui/icons-material';

const UrlMemory = ({ memory }) => {
  const { metadata } = memory;

  return (
    <Box sx={{ position: 'relative' }}>
      {metadata.previewImage && (
        <CardMedia
          component="img"
          height="200"
          image={metadata.previewImage}
          alt={metadata.siteName}
          sx={{ objectFit: 'cover' }}
        />
      )}
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Link 
          href={memory.content.text} 
          target="_blank" 
          rel="noopener noreferrer"
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            color: 'primary.main',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          <Typography variant="subtitle1" component="span">
            {metadata.siteName}
          </Typography>
          <Launch sx={{ ml: 0.5, fontSize: 16 }} />
        </Link>
        {metadata.urlDescription && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {metadata.urlDescription}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default UrlMemory;
