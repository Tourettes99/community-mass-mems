import React from 'react';
import { Box, Link, Typography } from '@mui/material';

const PatreonBar: React.FC = () => {
  return (
    <Box
      sx={{
        mt: 4,
        p: 2,
        bgcolor: '#FF424D', // Patreon red color
        borderRadius: '12px', // Rounded corners
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 3,
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 6,
        },
      }}
    >
      <Link
        href="https://www.patreon.com/communitymass"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          Support Community Mass on Patreon
        </Typography>
      </Link>
    </Box>
  );
};

export default PatreonBar;
