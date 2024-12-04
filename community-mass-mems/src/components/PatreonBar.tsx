import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';

const PatreonBar = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
      }}
    >
      <Tooltip title="Support on Patreon" arrow placement="left">
        <IconButton
          component="a"
          href="https://patreon.com/Foxplaid19773"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            bgcolor: '#FF424D',
            width: { xs: 48, sm: 56 },
            height: { xs: 48, sm: 56 },
            borderRadius: '12px',
            color: 'white',
            boxShadow: 3,
            transition: 'all 0.2s ease-in-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              bgcolor: '#FF424D',
              transform: 'translateY(-2px)',
              boxShadow: 6,
            },
          }}
        >
          <Box
            component="i"
            className="fa-brands fa-patreon"
            sx={{
              fontSize: { xs: '24px', sm: '28px' },
              width: '1em',
              height: '1em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default PatreonBar;
