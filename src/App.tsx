import React from 'react';
import { createBrowserRouter, RouterProvider, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import TestUpload from './pages/TestUpload';

const theme = createTheme();

const router = createBrowserRouter([
  {
    path: "/",
    element: <TestUpload />
  },
  {
    path: "/test-upload",
    element: <TestUpload />
  }
], {
  future: {
    // These are the correct flag names in the latest version
    startTransition: true,
    relativeSplatPath: true
  }
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;
