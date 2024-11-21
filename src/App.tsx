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
  // Initialize state with persisted data or empty array
  const [memories, setMemories] = useState<Memory[]>(() => {
    try {
      const savedMemories = localStorage.getItem('memories');
      return savedMemories ? JSON.parse(savedMemories) : [];
    } catch {
      return [];
    }
  });
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
      const newMemories = Array.isArray(data) ? data : [];
      setMemories(newMemories);
      // Persist to localStorage
      localStorage.setItem('memories', JSON.stringify(newMemories));
    } catch (error) {
      console.error('Error fetching memories:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch memories');
      setMemories([]);
      // Clear localStorage on error
      localStorage.removeItem('memories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  // Persist memories whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('memories', JSON.stringify(memories));
    } catch (error) {
      console.error('Failed to save memories:', error);
    }
  }, [memories]);

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
    setMemories(prev => {
      const newMemories = Array.isArray(prev) ? [newMemory, ...prev] : [newMemory];
      // Persist immediately on memory creation
      try {
        localStorage.setItem('memories', JSON.stringify(newMemories));
      } catch (error) {
        console.error('Failed to save new memory:', error);
      }
      return newMemories;
    });
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
