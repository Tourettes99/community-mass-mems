import React, { useState } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline, Container, Snackbar, Alert, Box, Stack } from '@mui/material';
import { ThemeProvider } from './contexts/ThemeContext';
import { useTheme } from './contexts/ThemeContext';
import { getTheme } from './theme';
import MemoryGrid from './components/MemoryGrid';
import IntroDialog from './components/IntroDialog';
import InfoBar from './components/InfoBar';
import PatreonBar from './components/PatreonBar';
import ThemeToggle from './components/ThemeToggle';
import UploadBar from './components/UploadBar';
import useMemoryStore from './stores/memoryStore';
import SocialScripts from './components/SocialScripts';
import AnnouncementBanner from './components/AnnouncementBanner';
import AnnouncementBell from './components/AnnouncementBell';
import useAnnouncementStore from './stores/announcementStore';

const AppContent = () => {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  
  // Initialize intro dialog state
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return localStorage.getItem('introShown') !== 'true';
    } catch {
      return true;
    }
  });

  const handleCloseIntro = () => {
    setShowIntro(false);
    try {
      localStorage.setItem('introShown', 'true');
    } catch {
      console.warn('Failed to save intro state to localStorage');
    }
  };

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <InfoBar />
        <ThemeToggle />
        <MemoryGrid />
        <IntroDialog open={showIntro} onClose={handleCloseIntro} />
      </Container>
    </MuiThemeProvider>
  );
};

const App = () => {
  const addMemories = useMemoryStore(state => state.addMemories);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { announcements, markAsRead } = useAnnouncementStore();

  const handleUpload = async (type: string, content: string, tags: string[]) => {
    try {
      const response = await fetch('/.netlify/functions/uploadUrl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          url: type === 'url' ? content : undefined,
          content: type === 'text' ? content : undefined,
          tags
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload memory');
      }

      const newMemory = await response.json();
      addMemories([newMemory]);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload memory');
      throw err;
    }
  };

  return (
    <ThemeProvider>
      <AnnouncementBanner />
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Stack spacing={2} direction="column" alignItems="flex-end" sx={{ position: 'fixed', right: 24, top: 24, zIndex: 1000 }}>
            <AnnouncementBell />
            <PatreonBar />
          </Stack>
          <UploadBar onUpload={handleUpload} />
          <AppContent />
        </Box>
      </Container>
      <SocialScripts />
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success">
          Memory uploaded successfully!
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
