import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import TestUpload from './pages/TestUpload';

const theme = createTheme();

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<TestUpload />} />
          <Route path="/test-upload" element={<TestUpload />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
