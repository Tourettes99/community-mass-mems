import React, { useState, useRef } from 'react';
import { 
  Paper, 
  Button, 
  Box, 
  TextField, 
  CircularProgress,
  Typography,
  IconButton
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CancelIcon from '@mui/icons-material/Cancel';
import axios from 'axios';

const UploadBar: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        }
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url) return;

    setUploading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/upload-url`, { url });
      setUrl('');
    } catch (error) {
      console.error('URL upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUrl('');
    setUploading(false);
    setUploadProgress(0);
  };

  return (
    <Paper 
      elevation={3}
      sx={{
        p: 2,
        mb: 3,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        alignItems: 'center'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.gif"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button
            component="span"
            variant="contained"
            startIcon={<CloudUploadIcon />}
            disabled={uploading}
          >
            Upload File
          </Button>
        </label>
        <Typography variant="body2" color="text.secondary">
          or
        </Typography>
        <TextField
          fullWidth
          placeholder="Paste URL here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={uploading}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {uploading && (
          <>
            <CircularProgress 
              variant="determinate" 
              value={uploadProgress} 
              size={24} 
            />
            <IconButton onClick={handleCancel} color="secondary">
              <CancelIcon />
            </IconButton>
          </>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleUrlSubmit}
          disabled={uploading || !url}
        >
          Submit URL
        </Button>
      </Box>
    </Paper>
  );
};

export default UploadBar;
