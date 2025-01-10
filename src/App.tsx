import React, { useEffect } from 'react';
import { RouterProvider, UNSAFE_NavigationContext } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import router from './router';
import './routerConfig';

const theme = createTheme();

const App: React.FC = () => {
  // Initialize router configuration
  useEffect(() => {
    UNSAFE_NavigationContext.displayName = 'NavigationContext';
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;
