import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

const WelcomeDialog = () => {
  const [open, setOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio] = useState(new Audio('/episode 1. introduktion.mp3'));

  useEffect(() => {
    // Check if this is the first visit
    const hasVisited = localStorage.getItem('hasVisitedR1Memories');
    if (!hasVisited) {
      setOpen(true);
      localStorage.setItem('hasVisitedR1Memories', 'true');
    }

    // Clean up audio on unmount
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audio]);

  const handlePlay = () => {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleClose = () => {
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setOpen(false);
  };

  // Add event listeners for audio
  useEffect(() => {
    const handleEnded = () => {
      setIsPlaying(false);
      audio.currentTime = 0;
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audio]);

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(145deg, #2196f3 0%, #1976d2 100%)',
          color: 'white'
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
          Welcome to R1 Memories
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h6" gutterBottom>
            Would you like to listen to the introduction?
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            onClick={handlePlay}
            sx={{ mt: 2 }}
          >
            {isPlaying ? 'Pause' : 'Play'} Introduction
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          color="inherit"
          sx={{ color: 'white', borderColor: 'white' }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WelcomeDialog;
