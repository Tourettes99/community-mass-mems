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
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Validate the response data
      if (!Array.isArray(data)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

      setMemories(data);
      // Only persist valid data
      localStorage.setItem('memories', JSON.stringify(data));
      
      console.log(`Loaded ${data.length} memories from database`);
    } catch (error) {
      console.error('Error fetching memories:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch memories');
      
      // On error, try to load from localStorage as fallback
      try {
        const savedMemories = localStorage.getItem('memories');
        if (savedMemories) {
          const parsedMemories = JSON.parse(savedMemories);
          if (Array.isArray(parsedMemories)) {
            setMemories(parsedMemories);
            console.log(`Loaded ${parsedMemories.length} memories from localStorage as fallback`);
          }
        }
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
        setMemories([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch memories on mount and set up refresh interval
  useEffect(() => {
    fetchMemories();

    // Refresh memories every 30 seconds
    const intervalId = setInterval(fetchMemories, 30000);

    return () => clearInterval(intervalId);
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
