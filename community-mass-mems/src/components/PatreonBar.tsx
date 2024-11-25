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
            width: 56,
            height: 56,
            borderRadius: '12px',
            color: 'white',
            boxShadow: 3,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              bgcolor: '#FF424D',
              transform: 'translateY(-2px)',
              boxShadow: 6,
            },
          }}
        >
          <i className="fa-brands fa-patreon" style={{ fontSize: '28px' }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default PatreonBar;
