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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const UploadBar: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelTokenRef = useRef<any>(null);

  const handleError = (error: any) => {
    let errorMessage = 'Upload failed. Please try again.';
    if (error.code === 'ERR_NETWORK') {
      errorMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.response?.status === 404) {
      errorMessage = 'The upload service is currently unavailable. Our team has been notified.';
    } else if (error.response?.status === 413) {
      errorMessage = 'File is too large. Maximum size is 10MB.';
    } else if (error.response?.status === 415) {
      errorMessage = 'Unsupported file type. Please upload JPEG, PNG, GIF, or WebP images.';
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10MB.';
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Unsupported file type. Please upload JPEG, PNG, GIF, or WebP images.';
    }

    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    const file = files[0];
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      cancelTokenRef.current = axios.CancelToken.source();
      
      await axios.post('/.netlify/functions/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        cancelToken: cancelTokenRef.current.token,
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
      if (axios.isCancel(error)) {
        setError('Upload cancelled');
      } else {
        handleError(error);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      cancelTokenRef.current = null;
    }
  };

  const handleUrlSubmit = async () => {
    if (!url) return;

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      cancelTokenRef.current = axios.CancelToken.source();
      
      await axios.post('/.netlify/functions/upload', 
        { url, type: 'url' },
        { cancelToken: cancelTokenRef.current.token }
      );
      setUrl('');
    } catch (error: any) {
      if (axios.isCancel(error)) {
        setError('Upload cancelled');
      } else {
        handleError(error);
      }
    } finally {
      setUploading(false);
      cancelTokenRef.current = null;
    }
  };

  const handleCancel = () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Upload cancelled by user');
    }
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
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              ref={fileInputRef}
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
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !uploading) {
                  handleUrlSubmit();
                }
              }}
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
            {uploading ? (
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
            ) : url && (
              <Button
                onClick={handleUrlSubmit}
                variant="contained"
                disabled={uploading}
                size="small"
              >
                Upload URL
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default UploadBar;
