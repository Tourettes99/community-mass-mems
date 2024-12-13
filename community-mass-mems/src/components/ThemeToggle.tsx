import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { mode, toggleTheme } = useTheme();

  return (
    <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`} arrow>
      <IconButton
        onClick={toggleTheme}
        color="inherit"
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          bgcolor: mode === 'light' ? 'background.paper' : 'background.default',
          boxShadow: 3,
          '&:hover': {
            bgcolor: mode === 'light' ? 'grey.100' : 'grey.900',
          },
          zIndex: 1000,
        }}
      >
        {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
