import React from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline, Container, Box, Snackbar, Alert } from '@mui/material';
import { ThemeProvider } from './contexts/ThemeContext';
import { useTheme } from './contexts/ThemeContext';
import { getTheme } from './theme';
import MemoryGrid from './components/MemoryGrid';
import UploadBar from './components/UploadBar';
import IntroDialog from './components/IntroDialog';
import InfoBar from './components/InfoBar';
import PatreonBar from './components/PatreonBar';
import ThemeToggle from './components/ThemeToggle';

const AppContent = () => {
  const { mode } = useTheme();
  const theme = getTheme(mode);
  
  // Initialize intro dialog state
  const [showIntro, setShowIntro] = React.useState(() => {
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
          
          <UploadBar />
          
          <MemoryGrid />

          <IntroDialog open={showIntro} onClose={handleCloseIntro} />
        </Container>
      </Box>
    </MuiThemeProvider>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
