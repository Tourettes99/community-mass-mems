import React, { useState, useRef } from 'react';
import { 
  Paper, 
  Button, 
  Box, 
  TextField, 
  CircularProgress,
  Typography,
  IconButton,
  Container,
  Tabs,
  Tab,
  Stack
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CancelIcon from '@mui/icons-material/Cancel';
import LinkIcon from '@mui/icons-material/Link';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import axios from 'axios';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type UploadType = 'file' | 'url' | 'text';

const UploadBar: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [uploadType, setUploadType] = useState<UploadType>('url');
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
      
      await axios.post('/api/upload', formData, {
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
      
      await axios.post('/api/upload', 
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

  const handleTextSubmit = async () => {
    if (!text.trim()) return;

    setUploading(true);
    setError(null);
    try {
      cancelTokenRef.current = axios.CancelToken.source();
      
      await axios.post('/api/upload', {
        type: 'text',
        content: text,
        metadata: {
          title: title || 'Text Note',
          type: 'text',
          description: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          content: text,
        }
      }, {
        cancelToken: cancelTokenRef.current.token
      });
      setText('');
      setTitle('');
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
    setText('');
    setTitle('');
    setUploading(false);
    setUploadProgress(0);
    setError(null);
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        mb: 4, 
        borderRadius: 2,
        bgcolor: 'background.paper' 
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={uploadType} 
          onChange={(_, newValue: UploadType) => setUploadType(newValue)}
          aria-label="upload type tabs"
          centered
        >
          <Tab 
            icon={<LinkIcon />} 
            label="Link" 
            value="url"
          />
          <Tab 
            icon={<TextFieldsIcon />} 
            label="Text" 
            value="text"
          />
          <Tab 
            icon={<CloudUploadIcon />} 
            label="File" 
            value="file"
          />
        </Tabs>
      </Box>

      {error && (
        <Typography 
          color="error" 
          variant="body2" 
          sx={{ mb: 2 }}
        >
          {error}
        </Typography>
      )}

      {uploadType === 'url' && (
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Enter URL"
            variant="outlined"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={uploading}
            placeholder="https://"
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            {uploading && (
              <Button
                color="secondary"
                onClick={handleCancel}
                startIcon={<CancelIcon />}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleUrlSubmit}
              disabled={!url || uploading}
            >
              {uploading ? 'Adding...' : 'Add Link'}
            </Button>
          </Box>
        </Stack>
      )}

      {uploadType === 'text' && (
        <Stack spacing={2}>
          <TextField
            label="Title (Optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            disabled={uploading}
          />
          <TextField
            label="Your Text"
            multiline
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            fullWidth
            variant="outlined"
            required
            disabled={uploading}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            {uploading && (
              <Button
                color="secondary"
                onClick={handleCancel}
                startIcon={<CancelIcon />}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleTextSubmit}
              disabled={!text.trim() || uploading}
            >
              {uploading ? 'Adding...' : 'Add Text'}
            </Button>
          </Box>
        </Stack>
      )}

      {uploadType === 'file' && (
        <Box>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
          />
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Button
              variant="outlined"
              component="span"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              startIcon={<CloudUploadIcon />}
            >
              Choose File
            </Button>
          </Box>
          {uploading && (
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Uploading... {uploadProgress}%
              </Typography>
              <Button
                color="secondary"
                onClick={handleCancel}
                startIcon={<CancelIcon />}
                sx={{ mt: 1 }}
              >
                Cancel Upload
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default UploadBar;
