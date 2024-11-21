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
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[IntroDialog ${timestamp}] ${info}`);
    setDebugInfo(prev => `${prev}\n[${timestamp}] ${info}`);
  };

  // Function to check audio file existence and metadata
  const checkAudioFile = async () => {
    addDebugInfo('Starting audio file check...');
    addDebugInfo(`Audio path provided: ${audioPath}`);

    // Check public URL
    const publicUrl = `/${audioPath}`;
    addDebugInfo(`Checking public URL: ${publicUrl}`);

    // Check window location
    addDebugInfo(`Current window.location.origin: ${window.location.origin}`);
    addDebugInfo(`Current window.location.pathname: ${window.location.pathname}`);
    
    // Check process.env
    addDebugInfo(`process.env.PUBLIC_URL: ${process.env.PUBLIC_URL || 'not set'}`);
    addDebugInfo(`process.env.NODE_ENV: ${process.env.NODE_ENV}`);

    try {
      // Try to fetch the file
      addDebugInfo('Attempting to fetch audio file...');
      const response = await fetch(publicUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Log response details
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      addDebugInfo(`File fetch successful!`);
      addDebugInfo(`Content-Type: ${contentType}`);
      addDebugInfo(`Content-Length: ${contentLength} bytes`);

      // Try to get file metadata
      const blob = await response.blob();
      addDebugInfo(`File size: ${blob.size} bytes`);
      addDebugInfo(`File type: ${blob.type}`);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      addDebugInfo(`Error checking audio file: ${errorMsg}`);
      setError('Audio file not found or inaccessible.');
    }
  };

  useEffect(() => {
    if (waveformRef.current && open) {
      setIsLoading(true);
      setError(null);
      addDebugInfo('=== Starting WaveSurfer Initialization ===');
      addDebugInfo(`Initializing WaveSurfer for audio: ${audioPath}`);

      try {
        // Cleanup previous instance
        if (wavesurferRef.current) {
          addDebugInfo('Cleaning up previous WaveSurfer instance');
          wavesurferRef.current.destroy();
        }

        // Create new instance
        addDebugInfo('Creating new WaveSurfer instance');
        const wavesurfer = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: '#FF5F1F',
          progressColor: '#808080',
          cursorColor: '#666666',
          barWidth: 2,
          barRadius: 3,
          responsive: true,
          height: 100,
          normalize: true,
          backend: 'MediaElement',
          mediaControls: false,
          autoplay: false,
          xhr: {
            cache: 'default',
            mode: 'cors',
            method: 'GET',
            credentials: 'same-origin',
            headers: [
              { key: 'Cache-Control', value: 'no-cache' },
            ]
          }
        });

        wavesurferRef.current = wavesurfer;

        // Configure audio path
        const fullPath = `/${audioPath}`;
        addDebugInfo(`Configured audio path: ${fullPath}`);
        addDebugInfo(`Full URL will be: ${window.location.origin}${fullPath}`);

        // Set up event handlers
        wavesurfer.on('error', () => {
          addDebugInfo('WaveSurfer error occurred');
          setError('Failed to load audio file. Please try again.');
          setIsLoading(false);
        });

        wavesurfer.on('ready', () => {
          addDebugInfo('WaveSurfer ready - Audio loaded successfully');
          try {
            const duration = wavesurfer.getDuration();
            addDebugInfo(`Audio duration: ${duration} seconds`);
          } catch (err) {
            addDebugInfo('Could not get duration');
          }
          setIsLoading(false);
          setError(null);
        });

        wavesurfer.on('loading', () => {
          addDebugInfo('Loading audio file...');
        });

        wavesurfer.on('finish', () => {
          addDebugInfo('Playback finished');
          setIsPlaying(false);
        });

        // Add more event handlers for debugging
        wavesurfer.on('play', () => {
          addDebugInfo('Playback started');
        });

        wavesurfer.on('pause', () => {
          addDebugInfo('Playback paused');
        });

        wavesurfer.on('decode', () => {
          addDebugInfo('Audio decoded successfully');
        });

        // Load the audio file
        addDebugInfo('Initiating audio file load');
        wavesurfer.load(fullPath);

        return () => {
          if (wavesurferRef.current) {
            addDebugInfo('Cleanup: Destroying WaveSurfer instance');
            wavesurferRef.current.destroy();
            wavesurferRef.current = null;
          }
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        addDebugInfo(`Error in WaveSurfer initialization: ${errorMsg}`);
        setError('Failed to initialize audio player.');
        setIsLoading(false);
      }
    }
  }, [open, audioPath]);

  const handlePlayPause = async () => {
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer) {
      addDebugInfo('Error: WaveSurfer instance not found');
      return;
    }

    try {
      addDebugInfo(`Attempting to ${isPlaying ? 'pause' : 'play'} audio`);
      
      if (isPlaying) {
        wavesurfer.pause();
        addDebugInfo('Pause command sent');
      } else {
        try {
          const duration = wavesurfer.getDuration();
          addDebugInfo(`Current duration: ${duration} seconds`);
          
          if (duration === 0) {
            addDebugInfo('Warning: Audio duration is 0, attempting to reload');
            await wavesurfer.load(`/${audioPath}`);
          }
        } catch (err) {
          addDebugInfo('Could not get duration, attempting to play anyway');
        }
        
        await wavesurfer.play();
        addDebugInfo('Play command sent');
      }
      
      setIsPlaying(!isPlaying);
      addDebugInfo(`Successfully ${isPlaying ? 'paused' : 'started'} playback`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      addDebugInfo(`Error in playback control: ${errorMsg}`);
      try {
        addDebugInfo('Attempting to recover by reloading audio');
        await wavesurfer.load(`/${audioPath}`);
      } catch (reloadErr) {
        addDebugInfo('Recovery attempt failed');
      }
      setError('Failed to control audio playback. Please try again.');
    }
  };

  const handleSkip = () => {
    addDebugInfo('User clicked Skip');
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
      addDebugInfo('Stopped audio playback');
    }
    onClose();
  };

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
        <Box mt={2} p={1} bgcolor="grey.100" borderRadius={1}>
          <Typography variant="caption" component="pre" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {debugInfo}
          </Typography>
        </Box>
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
