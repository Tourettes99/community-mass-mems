import React, { useState, useRef } from 'react';
import { 
  Paper, 
  Button, 
  Box, 
  TextField, 
  CircularProgress,
  Typography,
  IconButton,
  Container
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CancelIcon from '@mui/icons-material/Cancel';
import axios from 'axios';

const UploadBar: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleError = (error: any) => {
    let errorMessage = 'Upload failed. Please try again.';
    if (error.code === 'ERR_NETWORK') {
      errorMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.response?.status === 404) {
      errorMessage = 'The upload service is currently unavailable. Our team has been notified.';
    } else if (error.response?.status === 413) {
      errorMessage = 'File is too large. Please try a smaller file.';
    }
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      await axios.post('/api/upload', formData, {
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
    } catch (error: any) {
      handleError(error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url) return;

    setUploading(true);
    setError(null);
    try {
      await axios.post('/api/upload', { url, type: 'url' });
      setUrl('');
    } catch (error: any) {
      handleError(error);
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
    setError(null);
  };

  return (
    <Container maxWidth="lg">
      <Paper 
        elevation={3}
        sx={{
          p: 3,
          mb: 3,
          bgcolor: 'background.paper',
        }}
      >
        {error && (
          <Box sx={{ mb: 2 }}>
            <Typography 
              variant="body2"
              sx={{ 
                textAlign: 'center',
                bgcolor: 'error.light',
                color: 'error.contrastText',
                p: 1,
                borderRadius: 1
              }}
            >
              {error}
            </Typography>
          </Box>
        )}
        
        <Box sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          alignItems: { xs: 'stretch', sm: 'center' },
        }}>
          <Box sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            gap: 2,
            flex: 1,
          }}>
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
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Upload File
              </Button>
            </label>
            
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{
                display: { xs: 'none', sm: 'block' }
              }}
            >
              or
            </Typography>
            
            <TextField
              fullWidth
              placeholder="Paste URL here"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={uploading}
              size="small"
              sx={{
                flexGrow: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </Box>

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 1,
            justifyContent: { xs: 'flex-end', sm: 'flex-start' }
          }}>
            {uploading && (
              <>
                <CircularProgress 
                  variant="determinate" 
                  value={uploadProgress} 
                  size={24} 
                />
                <IconButton 
                  onClick={handleCancel} 
                  color="secondary"
                  size="small"
                >
                  <CancelIcon />
                </IconButton>
              </>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={handleUrlSubmit}
              disabled={uploading || !url}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Submit URL
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default UploadBar;
