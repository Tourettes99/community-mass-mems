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
      const response = await fetch('/.netlify/functions/getMemories', {
        headers: {
          'Accept': 'application/json'
        }
      });
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

      setMemories(sortedData);
      if (isBackground) {
        console.log(`Silently updated with ${data.length} memories`);
      } else {
        console.log(`Loaded ${data.length} memories from database`);
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
  }, []);

  const handleMemoryUpdate = useCallback((updatedMemory: Memory) => {
    setMemories(prevMemories => {
      const index = prevMemories.findIndex(m => m._id === updatedMemory._id);
      if (index === -1) return prevMemories;
      
      const newMemories = [...prevMemories];
      newMemories[index] = updatedMemory;
      return newMemories;
    });
  }, []);

  useEffect(() => {
    fetchMemories(false);

    // Poll for updates every 30 seconds
    const intervalId = setInterval(() => {
      fetchMemories(true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchMemories]);

  const handleUploadSuccess = useCallback((message: string) => {
    setNotification(message);
    fetchMemories(false);
  }, [fetchMemories]);

  const handleCloseIntro = useCallback(() => {
    setShowIntro(false);
    try {
      localStorage.setItem('introShown', 'true');
    } catch {
      console.warn('Failed to save intro state to localStorage');
    }
  }, []);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          color: 'text.primary',
          pt: 2,
          pb: 6
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <ThemeToggle />
          </Box>

          <InfoBar />
          <PatreonBar />
          
          <UploadBar onUploadSuccess={handleUploadSuccess} />
          
          <MemoryGrid
            memories={memories}
            loading={loading}
            error={error}
            onRefresh={() => fetchMemories(false)}
            isBackgroundRefresh={isBackgroundRefresh}
            onMemoryUpdate={handleMemoryUpdate}
          />

          <Snackbar
            open={!!notification}
            autoHideDuration={6000}
            onClose={() => setNotification(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert 
              onClose={() => setNotification(null)} 
              severity="success"
              variant="filled"
            >
              {notification}
            </Alert>
          </Snackbar>

          <IntroDialog open={showIntro} onClose={handleCloseIntro} />
        </Container>
      </Box>
    </MuiThemeProvider>
  );
};

const App = () => (
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
);

export default App;
