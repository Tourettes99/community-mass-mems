import React, { useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline, Container, Snackbar, Alert, Box, Stack } from '@mui/material';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useTheme } from '../contexts/ThemeContext';
import { getTheme } from '../theme';
import MemoryGrid from '../components/MemoryGrid';
import IntroDialog from '../components/IntroDialog';
import InfoBar from '../components/InfoBar';
import PatreonBar from '../components/PatreonBar';
import ThemeToggle from '../components/ThemeToggle';
import UploadBar from '../components/UploadBar';
import useMemoryStore from '../stores/memoryStore';
import SocialScripts from '../components/SocialScripts';
import AnnouncementBanner from '../components/AnnouncementBanner';
import AnnouncementBell from '../components/AnnouncementBell';
import useAnnouncementStore from '../stores/announcementStore';

const Home: React.FC = () => {
  const { mode } = useTheme();
  const [showIntro, setShowIntro] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const addMemories = useMemoryStore(state => state.addMemories);

  const handleCloseIntro = () => {
    setShowIntro(false);
    localStorage.setItem('introShown', 'true');
  };

  useEffect(() => {
    const introShown = localStorage.getItem('introShown');
    if (introShown) {
      setShowIntro(false);
    }
  }, []);

  const handleUpload = async (type: string, content: { url?: string; content?: string }, tags: string[]) => {
    try {
      const response = await fetch('/.netlify/functions/uploadUrl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, ...content, tags }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload');
      }

      addMemories([data]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <MuiThemeProvider theme={getTheme(mode)}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Stack spacing={2} direction="column" alignItems="flex-end" sx={{ position: 'fixed', right: 24, top: 24, zIndex: 1000 }}>
            <ThemeToggle />
            <AnnouncementBell />
            <PatreonBar />
          </Stack>
          <UploadBar onUpload={handleUpload} />
          <MemoryGrid />
          <IntroDialog open={showIntro} onClose={handleCloseIntro} />
          <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
            <Alert severity="error">{error}</Alert>
          </Snackbar>
          <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}>
            <Alert severity="success">Successfully uploaded!</Alert>
          </Snackbar>
        </Box>
      </Container>
      <SocialScripts />
    </MuiThemeProvider>
  );
};

export default Home; 