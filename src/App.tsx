import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Container } from '@mui/material';
import { theme } from './theme';
import MemoryGrid from './components/MemoryGrid';
import UploadBar from './components/UploadBar';
import IntroDialog from './components/IntroDialog';
import InfoBar from './components/InfoBar';
import PatreonBar from './components/PatreonBar';
import { Memory } from './types';

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    return localStorage.getItem('introShown') !== 'true';
  });

  const [memories, setMemories] = useState<Memory[]>([]);

  const fetchMemories = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-memories');
      if (!response.ok) throw new Error('Failed to fetch memories');
      const data: Memory[] = await response.json();
      setMemories(data);
    } catch (error) {
      console.error('Error fetching memories:', error);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  useEffect(() => {
    if (!showIntro) {
      localStorage.setItem('introShown', 'true');
    }
  }, [showIntro]);

  const handleMemoryCreated = (newMemory: Memory) => {
    setMemories(prev => [newMemory, ...prev]);
  };

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
          <UploadBar onMemoryCreated={handleMemoryCreated} />
          <MemoryGrid memories={memories} />
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
