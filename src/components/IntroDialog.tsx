import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

interface IntroDialogProps {
  open: boolean;
  onClose: () => void;
}

const IntroDialog: React.FC<IntroDialogProps> = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="intro-dialog-title"
    >
      <DialogTitle id="intro-dialog-title">
        Welcome to Community Mass Memories!
      </DialogTitle>
      <DialogContent>
        <Typography paragraph>
          Welcome to our community memory sharing platform! This space is designed for sharing and preserving memories that matter to our community.
        </Typography>
        <Typography paragraph>
          You can share:
          • Links to interesting content
          • Text-based memories
          • Images (coming soon)
          • Videos (coming soon)
          • Audio clips (coming soon)
        </Typography>
        <Typography paragraph>
          Each memory can be voted on by the community, helping to highlight the most meaningful content.
        </Typography>
        <Typography>
          Start exploring or share your first memory using the upload bar above!
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Get Started
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IntroDialog;
