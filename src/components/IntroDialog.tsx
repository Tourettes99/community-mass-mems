import React, { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Box,
  Alert
} from '@mui/material';
import WaveSurfer from 'wavesurfer.js';

interface IntroDialogProps {
  open: boolean;
  onClose: () => void;
  audioPath: string;
}

const IntroDialog: React.FC<IntroDialogProps> = ({ open, onClose, audioPath }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer>();

  useEffect(() => {
    if (waveformRef.current && open) {
      try {
        wavesurferRef.current = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: '#FF5F1F',
          progressColor: '#808080',
          cursorColor: '#666666',
          barWidth: 2,
          barRadius: 3,
          responsive: true,
          height: 100,
          normalize: true,
          backend: 'WebAudio'
        });

        const fullPath = `${process.env.PUBLIC_URL}/${audioPath}`;
        console.log('Loading audio from:', fullPath);

        // Type-safe event handlers
        wavesurferRef.current.on('error', () => {
          console.error('WaveSurfer error occurred');
          setError('Failed to load audio file. Please try again.');
          setIsLoading(false);
        });

        wavesurferRef.current.on('ready', () => {
          console.log('WaveSurfer ready');
          setIsLoading(false);
          setError(null);
        });

        wavesurferRef.current.on('finish', () => {
          console.log('Playback finished');
          setIsPlaying(false);
        });

        wavesurferRef.current.on('loading', (progress) => {
          console.log('Loading progress:', progress);
        });

        wavesurferRef.current.on('load', () => {
          console.log('Audio file loaded');
        });

        // Load the audio file
        wavesurferRef.current.load(fullPath);

        return () => {
          if (wavesurferRef.current) {
            wavesurferRef.current.destroy();
          }
        };
      } catch (err) {
        console.error('Error initializing WaveSurfer:', err);
        setError('Failed to initialize audio player.');
        setIsLoading(false);
      }
    }
  }, [open, audioPath]);

  const handlePlayPause = async () => {
    if (wavesurferRef.current) {
      try {
        if (isPlaying) {
          wavesurferRef.current.pause();
        } else {
          await wavesurferRef.current.play();
        }
        setIsPlaying(!isPlaying);
      } catch (err) {
        console.error('Error playing/pausing audio:', err);
        setError('Failed to play audio. Please try again.');
      }
    }
  };

  const handleSkip = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
    }
    onClose();
  };

  // Function to check if audio file exists
  const checkAudioFile = async () => {
    try {
      const response = await fetch(`${process.env.PUBLIC_URL}/${audioPath}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      console.log('Audio file content type:', contentType);
      if (!contentType?.includes('audio')) {
        console.warn('Content-Type is not audio:', contentType);
      }
    } catch (err) {
      console.error('Error checking audio file:', err);
      setError('Audio file not found or inaccessible.');
    }
  };

  // Check audio file when dialog opens
  useEffect(() => {
    if (open) {
      checkAudioFile();
    }
  }, [open, audioPath]);

  return (
    <Dialog 
      open={open} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle>Welcome to R1 Community Memories</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box ref={waveformRef} sx={{ my: 2 }} />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={handlePlayPause}
          variant="contained"
          color="primary"
          disabled={isLoading || !!error}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <Button 
          onClick={handleSkip}
          variant="outlined"
          color="secondary"
        >
          Skip
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IntroDialog;
