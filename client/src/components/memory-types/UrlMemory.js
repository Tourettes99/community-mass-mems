import React from 'react';
import { Box, CardMedia, Typography, Link } from '@mui/material';
import { Launch } from '@mui/icons-material';

const UrlMemory = ({ memory }) => {
  const { urlMetadata } = memory;

  return (
    <Box sx={{ position: 'relative' }}>
      {urlMetadata.image && (
        <CardMedia
          component="img"
          height="200"
          image={urlMetadata.image}
          alt={urlMetadata.title}
          sx={{ objectFit: 'cover' }}
        />
      )}
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Link 
          href={memory.content} 
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
            {urlMetadata.title || urlMetadata.siteName}
          </Typography>
          <Launch sx={{ ml: 0.5, fontSize: 16 }} />
        </Link>
        {urlMetadata.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {urlMetadata.description}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {urlMetadata.siteName}
        </Typography>
      </Box>
    </Box>
  );
};

export default UrlMemory;
