import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Alert,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import UploadForm from './components/UploadForm';
import MemoryGrid from './components/MemoryGrid';
import ConnectionTest from './components/ConnectionTest';
import { getMemories } from './api';

// RAL 2005 color (luminous orange)
const theme = createTheme({
  palette: {
    primary: {
      main: '#FF4D06',
    },
    background: {
      default: '#ffffff',
    },
    text: {
      primary: '#000000',
    },
  },
});

function App() {
  const [showWarning, setShowWarning] = useState(true);
  const [memories, setMemories] = useState([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showConnectionTest, setShowConnectionTest] = useState(true);

  useEffect(() => {
    // Check if this is the user's first visit
    const hasVisited = localStorage.getItem('hasVisitedR1Memories');
    if (!hasVisited) {
      setShowWelcome(true);
    }
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      const data = await getMemories();
      setMemories(data);
    } catch (error) {
      console.error('Error loading memories:', error);
    }
  };

  const handlePlayIntro = async () => {
    console.log('Play button clicked');
    try {
      // Using the direct file path
      const audioPath = 'C:/Users/isman/Documents/r1 memories/episode 1. introduktion.mp3';
      console.log('Attempting to play audio from:', audioPath);
      
      const audio = new Audio(audioPath);
      
      audio.addEventListener('loadstart', () => console.log('Audio loading started'));
      audio.addEventListener('loadeddata', () => console.log('Audio data loaded'));
      audio.addEventListener('canplay', () => console.log('Audio can play'));
      audio.addEventListener('error', (e) => console.error('Audio error:', e));
      
      await audio.play();
      console.log('Audio playing successfully');
      localStorage.setItem('hasVisitedR1Memories', 'true');
      setShowWelcome(false);
    } catch (error) {
      console.error('Error playing audio:', error);
      
      // Try alternative method using fetch
      try {
        console.log('Trying alternative method...');
        const response = await fetch('http://localhost:5000/audio/introduction');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        await audio.play();
        console.log('Alternative method successful');
        localStorage.setItem('hasVisitedR1Memories', 'true');
        setShowWelcome(false);
      } catch (err) {
        console.error('Alternative method failed:', err);
      }
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Patreon Link Card */}
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3, 
            display: 'flex', 
            alignItems: 'center',
            backgroundColor: '#FF424D',
            color: 'white',
            '&:hover': {
              backgroundColor: '#E23B45',
              cursor: 'pointer'
            }
          }}
          onClick={() => window.open('https://patreon.com/Foxplaid19773?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink', '_blank')}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <img 
              src="https://c5.patreon.com/external/logo/downloads_wordmark_white_on_coral.png" 
              alt="Patreon"
              style={{ height: '24px', marginRight: '16px' }}
            />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Support R1 Memories on Patreon
            </Typography>
            <Typography variant="body2">
              Click to join our community →
            </Typography>
          </Box>
        </Paper>

        {/* Welcome Dialog */}
        <Dialog
          open={showWelcome}
          onClose={() => setShowWelcome(false)}
          aria-labelledby="welcome-dialog-title"
        >
          <DialogTitle id="welcome-dialog-title">
            Welcome to R1 Memories
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Welcome! Would you like to listen to the introduction?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setShowWelcome(false)}
              color="primary"
            >
              Skip
            </Button>
            <Button
              onClick={handlePlayIntro}
              color="primary"
              variant="contained"
              startIcon={<PlayArrowIcon />}
            >
              Play Introduction
            </Button>
          </DialogActions>
        </Dialog>

        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
          {showConnectionTest && (
            <Paper sx={{ mb: 2 }}>
              <ConnectionTest />
            </Paper>
          )}
          <Collapse in={showWarning}>
            <Alert
              severity="info"
              action={
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={() => setShowWarning(false)}
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              }
              sx={{ mb: 2 }}
            >
              Remember this site is for all R1 users memories be it in text, images, gifs, audio files and embedded links. 
              Do not enter personal information or anything you regret uploading. Once it has been uploaded it stays there. 
              You can however cancel an upload.
            </Alert>
          </Collapse>

          <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
              R1 Community Memories
            </Typography>
            <UploadForm onUploadSuccess={loadMemories} />
          </Paper>

          <MemoryGrid memories={memories} />
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
