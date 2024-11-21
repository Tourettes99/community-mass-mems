import React, { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Box,
  Alert,
  CircularProgress,
  Typography
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
  const [debugInfo, setDebugInfo] = useState<string>('');
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer>();

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => `${prev}\n${new Date().toISOString()}: ${info}`);
  };

  useEffect(() => {
    if (waveformRef.current && open) {
      setIsLoading(true);
      setError(null);
      addDebugInfo('Initializing WaveSurfer...');

      try {
        // Destroy previous instance if it exists
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
        }

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
          backend: 'WebAudio',
          autoplay: false
        });

        // Use absolute path from root
        const fullPath = `/${audioPath}`;
        addDebugInfo(`Loading audio from: ${fullPath}`);

        // Type-safe event handlers
        wavesurferRef.current.on('error', () => {
          const errorMsg = 'Failed to load audio file. Please try again.';
          addDebugInfo(`Error: ${errorMsg}`);
          setError(errorMsg);
          setIsLoading(false);
        });

        wavesurferRef.current.on('ready', () => {
          addDebugInfo('WaveSurfer ready');
          setIsLoading(false);
          setError(null);
        });

        wavesurferRef.current.on('finish', () => {
          addDebugInfo('Playback finished');
          setIsPlaying(false);
        });

        // Load the audio file
        wavesurferRef.current.load(fullPath);

        return () => {
          if (wavesurferRef.current) {
            addDebugInfo('Destroying WaveSurfer instance');
            wavesurferRef.current.destroy();
          }
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        addDebugInfo(`Error initializing WaveSurfer: ${errorMsg}`);
        setError('Failed to initialize audio player.');
        setIsLoading(false);
      }
    }
  }, [open, audioPath]);

  const handlePlayPause = async () => {
    if (!wavesurferRef.current) {
      addDebugInfo('WaveSurfer instance not found');
      return;
    }

    try {
      addDebugInfo(`Attempting to ${isPlaying ? 'pause' : 'play'} audio`);
      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        await wavesurferRef.current.play();
      }
      setIsPlaying(!isPlaying);
      addDebugInfo(`Successfully ${isPlaying ? 'paused' : 'played'} audio`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      addDebugInfo(`Error playing/pausing audio: ${errorMsg}`);
      setError('Failed to play audio. Please try again.');
    }
  };

  const handleSkip = () => {
    addDebugInfo('Skipping intro');
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
    }
    onClose();
  };

  // Function to check if audio file exists
  const checkAudioFile = async () => {
    const fullPath = `/${audioPath}`;
    try {
      addDebugInfo(`Checking audio file at: ${fullPath}`);
      const response = await fetch(fullPath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      addDebugInfo(`Audio file content type: ${contentType}`);
      if (!contentType?.includes('audio')) {
        addDebugInfo(`Warning: Content-Type is not audio: ${contentType}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      addDebugInfo(`Error checking audio file: ${errorMsg}`);
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
        {isLoading && (
          <Box display="flex" justifyContent="center" my={2}>
            <CircularProgress />
          </Box>
        )}
        {process.env.NODE_ENV === 'development' && (
          <Box mt={2} p={1} bgcolor="grey.100" borderRadius={1}>
            <Typography variant="caption" component="pre" style={{ whiteSpace: 'pre-wrap' }}>
              {debugInfo}
            </Typography>
          </Box>
        )}
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
