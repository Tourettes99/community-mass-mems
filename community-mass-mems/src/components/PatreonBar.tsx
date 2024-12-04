import React from 'react';
import { Box, IconButton, Tooltip, SvgIcon } from '@mui/material';

const PatreonIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 512 512">
    <path d="M512 194.8c0 101.3-82.4 183.8-183.8 183.8-101.7 0-184.4-82.4-184.4-183.8 0-101.6 82.7-184.3 184.4-184.3C429.6 10.5 512 93.2 512 194.8zM0 501.5h90v-491H0v491z" />
  </SvgIcon>
);

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
          <PatreonIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default PatreonBar;
