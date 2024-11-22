import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import ImageIcon from '@mui/icons-material/Image';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

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
      <DialogTitle id="intro-dialog-title" sx={{ pb: 1 }}>
        Welcome to R1Memories.com!
      </DialogTitle>
      <DialogContent>
        <Typography paragraph>
          Welcome to the official memory sharing platform for Rabbit R1 users! This space is designed for our community to share and preserve memories that matter - from interesting discoveries to helpful tips and memorable moments with your R1.
        </Typography>
        <Typography paragraph>
          You can share any type of content through URLs or direct uploads:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><LinkIcon /></ListItemIcon>
            <ListItemText primary="Links to interesting content from anywhere on the web" />
          </ListItem>
          <ListItem>
            <ListItemIcon><TextSnippetIcon /></ListItemIcon>
            <ListItemText primary="Text-based memories, tips, and experiences" />
          </ListItem>
          <ListItem>
            <ListItemIcon><ImageIcon /></ListItemIcon>
            <ListItemText primary="Images (jpg, jpeg, png, gif, webp, svg, etc.)" />
          </ListItem>
          <ListItem>
            <ListItemIcon><VideoFileIcon /></ListItemIcon>
            <ListItemText primary="Videos (mp4, webm, ogg, mov, etc.)" />
          </ListItem>
          <ListItem>
            <ListItemIcon><AudioFileIcon /></ListItemIcon>
            <ListItemText primary="Audio clips (mp3, wav, aac, etc.)" />
          </ListItem>
          <ListItem>
            <ListItemIcon><InsertDriveFileIcon /></ListItemIcon>
            <ListItemText primary="Documents (pdf, doc, docx, etc.)" />
          </ListItem>
        </List>
        <Typography paragraph sx={{ mt: 2 }}>
          Each memory can be voted on by the community, helping to highlight the most meaningful content for R1 users.
        </Typography>
        <Typography>
          Start exploring or share your first R1 memory using the upload bar above!
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
