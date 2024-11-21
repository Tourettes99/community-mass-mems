import React, { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Box 
} from '@mui/material';
import WaveSurfer from 'wavesurfer.js';

interface IntroDialogProps {
  open: boolean;
  onClose: () => void;
  audioPath: string;
}

const IntroDialog: React.FC<IntroDialogProps> = ({ open, onClose, audioPath }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer>();

  useEffect(() => {
    if (waveformRef.current && open) {
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
      });

      wavesurferRef.current.load(`${process.env.PUBLIC_URL}/${audioPath}`);

      wavesurferRef.current.on('finish', () => {
        setIsPlaying(false);
      });

      return () => {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
        }
      };
    }
  }, [open, audioPath]);

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        wavesurferRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSkip = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
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
        <Box ref={waveformRef} sx={{ my: 2 }} />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={handlePlayPause}
          variant="contained"
          color="primary"
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
