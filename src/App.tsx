import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Container, Snackbar, Alert } from '@mui/material';
import { ThemeProvider } from './contexts/ThemeContext';
import { useTheme } from './contexts/ThemeContext';
import { getTheme } from './theme';
import MemoryGrid from './components/MemoryGrid';
import UploadBar from './components/UploadBar';
import IntroDialog from './components/IntroDialog';
import InfoBar from './components/InfoBar';
import PatreonBar from './components/PatreonBar';
import ThemeToggle from './components/ThemeToggle';
import { Memory } from './types';

const AppContent = () => {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);
  
  // Initialize intro dialog state
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return localStorage.getItem('introShown') !== 'true';
    } catch {
      return true;
    }
  });

  const fetchMemories = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    setIsBackgroundRefresh(isBackground);
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

      // Sort memories by creation date (newest first)
      const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      // Only update if there are changes
      const hasChanges = JSON.stringify(sortedData) !== JSON.stringify(memories);
      if (hasChanges) {
        setMemories(sortedData);
        if (isBackground) {
          console.log(`Silently updated with ${data.length} memories`);
        } else {
          console.log(`Loaded ${data.length} memories from database`);
        }
      }
    } catch (error) {
      console.error('Error fetching memories:', error);
      if (!isBackground) {
        setError(error instanceof Error ? error.message : 'Failed to fetch memories');
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
      setIsBackgroundRefresh(false);
    }
  }, [memories]);

  useEffect(() => {
    fetchMemories(false);

    // Poll for updates every 10 seconds
    const intervalId = setInterval(() => {
      fetchMemories(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [fetchMemories]);

  useEffect(() => {
    if (!showIntro) {
      try {
        localStorage.setItem('introShown', 'true');
      } catch (error) {
        console.error('Failed to save intro state:', error);
      }
    }
  }, [showIntro]);

  const handleMemoryCreated = async (newMemory: Memory) => {
    // Optimistically add the new memory to the list
    setMemories(prev => [newMemory, ...prev]);
    
    // Show notification
    setNotification('Memory added successfully!');
    
    // Fetch latest memories to ensure consistency
    await fetchMemories(true);
  };

  const handleRefresh = () => {
    setNotification('Refreshing memories...');
    fetchMemories(false);
  };

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <ThemeToggle />
        <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
          <InfoBar />
          <UploadBar onMemoryCreated={handleMemoryCreated} />
          <MemoryGrid 
            memories={memories} 
            loading={loading}
            error={error}
            onRefresh={handleRefresh}
            isBackgroundRefresh={isBackgroundRefresh}
          />
          <PatreonBar />
        </Container>
        <IntroDialog 
          open={showIntro} 
          onClose={() => setShowIntro(false)} 
          audioPath="episode-1-introduktion.mp3"
        />
        <Snackbar 
          open={!!notification} 
          autoHideDuration={3000} 
          onClose={() => setNotification(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setNotification(null)} 
            severity="success" 
            sx={{ width: '100%' }}
          >
            {notification}
          </Alert>
        </Snackbar>
      </Box>
    </MuiThemeProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
