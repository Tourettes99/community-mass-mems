import React from 'react';
import { Box, IconButton, Tooltip, SvgIcon, SvgIconProps } from '@mui/material';

const PatreonIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 512 512">
    <path d="M489.7 153.8c-.1-65.4-51-119-110.7-138.3C304.8-8.5 207-5 136.1 28.4C50.3 68.9 23.3 157.7 22.3 246.2C21.5 319 28.7 510.6 136.9 512c80.3 1 92.3-102.5 129.5-152.3c26.4-35.5 60.5-45.5 102.4-55.9c72-17.8 121.1-74.7 121-150z" />
  </SvgIcon>
);

const PatreonBar: React.FC = () => {
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
