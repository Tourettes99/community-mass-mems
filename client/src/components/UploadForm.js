import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Button, 
  CircularProgress,
  Typography,
  Paper,
  TextField,
  Tabs,
  Tab,
  Snackbar,
  Alert
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import LinkIcon from '@mui/icons-material/Link';
import { styled } from '@mui/material/styles';
import { uploadMemory } from '../api';

const StyledPaper = styled(Paper)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
  }
}));

const StyledUploadArea = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  border: '3px dashed',
  borderColor: theme.palette.primary.main,
  borderRadius: theme.spacing(2),
  backgroundColor: 'rgba(255, 77, 6, 0.05)',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 77, 6, 0.1)',
    transform: 'scale(1.01)',
  }
}));

const UploadForm = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [textContent, setTextContent] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTextSubmit = async () => {
    if (!textContent.trim()) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'text',
          content: textContent,
        }),
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      setTextContent('');
      onUploadSuccess();
      setSnackbar({ open: true, message: 'Text uploaded successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to upload text', severity: 'error' });
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'link',
          content: urlInput,
        }),
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      setUrlInput('');
      onUploadSuccess();
      setSnackbar({ open: true, message: 'URL uploaded successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to upload URL', severity: 'error' });
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    setUploading(true);
    const file = acceptedFiles[0];
    
    const formData = new FormData();
    formData.append('file', file);
    
    const fileType = file.type.startsWith('image/') ? 'image' :
                    file.type.startsWith('audio/') ? 'audio' :
                    file.type.includes('gif') ? 'gif' : 'text';
    
    formData.append('type', fileType);
    
    try {
      await uploadMemory(formData);
      onUploadSuccess();
      setSnackbar({ open: true, message: 'File uploaded successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to upload file', severity: 'error' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'audio/*': [],
      'text/*': [],
      'application/json': []
    }
  });

  return (
    <Box sx={{ mt: 3 }}>
      <StyledPaper elevation={3} sx={{ p: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          centered
          sx={{ mb: 3 }}
          TabIndicatorProps={{
            style: {
              backgroundColor: '#FF4D06',
            }
          }}
        >
          <Tab icon={<CloudUploadIcon />} label="Upload Files" />
          <Tab icon={<TextFieldsIcon />} label="Add Text" />
          <Tab icon={<LinkIcon />} label="Add URL" />
        </Tabs>

        {tabValue === 0 && (
          <StyledUploadArea {...getRootProps()}>
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="primary.main">
              {isDragActive ? 'Drop your files here' : 'Drag & drop files here'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Support for images, GIFs, and audio files
            </Typography>
            {uploading && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress variant="determinate" value={uploadProgress} />
              </Box>
            )}
          </StyledUploadArea>
        )}

        {tabValue === 1 && (
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              placeholder="Enter your text here..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleTextSubmit}
              disabled={!textContent.trim()}
              sx={{
                borderRadius: 2,
                py: 1.5,
                px: 4,
                boxShadow: '0 4px 12px rgba(255, 77, 6, 0.2)',
              }}
            >
              Add Text
            </Button>
          </Box>
        )}

        {tabValue === 2 && (
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Enter URL here..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
              sx={{
                borderRadius: 2,
                py: 1.5,
                px: 4,
                boxShadow: '0 4px 12px rgba(255, 77, 6, 0.2)',
              }}
            >
              Add URL
            </Button>
          </Box>
        )}
      </StyledPaper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UploadForm;
