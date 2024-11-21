import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Container } from '@mui/material';
import { theme } from './theme';
import MemoryGrid from './components/MemoryGrid';
import UploadBar from './components/UploadBar';
import IntroDialog from './components/IntroDialog';
import InfoBar from './components/InfoBar';
import PatreonBar from './components/PatreonBar';

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    return localStorage.getItem('introShown') !== 'true';
  });

  useEffect(() => {
    if (!showIntro) {
      localStorage.setItem('introShown', 'true');
    }
  }, [showIntro]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
          <InfoBar />
          <UploadBar />
          <MemoryGrid />
          <PatreonBar />
        </Container>
        <IntroDialog 
          open={showIntro} 
          onClose={() => setShowIntro(false)} 
          audioPath="episode-1-introduktion.mp3"
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
