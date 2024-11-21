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
  // Initialize state with empty array
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize intro dialog state
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return localStorage.getItem('introShown') !== 'true';
    } catch {
      return true;
    }
  });

  const fetchMemories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/.netlify/functions/get-memories');
      if (!response.ok) throw new Error('Failed to fetch memories');
      const data = await response.json();
      setMemories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching memories:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch memories');
      setMemories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  useEffect(() => {
    if (!showIntro) {
      try {
        localStorage.setItem('introShown', 'true');
      } catch (error) {
        console.error('Failed to save intro state:', error);
      }
    }
  }, [showIntro]);

  const handleMemoryCreated = (newMemory: Memory) => {
    setMemories(prev => Array.isArray(prev) ? [newMemory, ...prev] : [newMemory]);
  };

  const handleRefresh = () => {
    fetchMemories();
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
          <MemoryGrid 
            memories={memories} 
            loading={loading}
            error={error}
            onRefresh={handleRefresh}
          />
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
