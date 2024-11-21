import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface IntroDialogProps {
  open: boolean;
  onClose: () => void;
  audioPath: string;
}

const StyledAudio = styled('audio')({
  width: '100%',
  marginTop: '16px',
  marginBottom: '16px',
});

const DebugPanel = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: '#f5f5f5',
  borderRadius: theme.spacing(1),
  maxHeight: '200px',
  overflowY: 'auto',
}));

const IntroDialog: React.FC<IntroDialogProps> = ({ open, onClose, audioPath }) => {
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
  };

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const audioElement = e.currentTarget;
    const errorMessage = audioElement.error?.message || 'Unknown audio error';
    addDebugInfo(`Audio error: ${errorMessage}`);
    setError(`Failed to play audio: ${errorMessage}`);
  };

  const handleAudioLoaded = () => {
    addDebugInfo('Audio loaded successfully');
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="intro-dialog-title"
    >
      <DialogTitle id="intro-dialog-title">
        Welcome to R1 Community Memories
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Listen to this introduction about our community memory preservation project.
        </Typography>

        <StyledAudio
          ref={audioRef}
          controls
          src={`/${audioPath}`}
          onError={handleAudioError}
          onLoadedData={handleAudioLoaded}
        >
          Your browser does not support the audio element.
        </StyledAudio>

        {error && (
          <Typography color="error" variant="body2" gutterBottom>
            {error}
          </Typography>
        )}

        <DebugPanel>
          <Typography variant="caption" component="div" gutterBottom>
            Debug Information:
          </Typography>
          {debugInfo.map((info, index) => (
            <Typography key={index} variant="caption" component="div">
              {info}
            </Typography>
          ))}
        </DebugPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default IntroDialog;
