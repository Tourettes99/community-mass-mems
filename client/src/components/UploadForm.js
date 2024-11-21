import React, { useState, useRef } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  CircularProgress, 
  Alert,
  Tabs,
  Tab,
  IconButton
} from '@mui/material';
import { uploadMemory } from '../api';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import LinkIcon from '@mui/icons-material/Link';

const UploadForm = ({ onUploadComplete }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError('');
    setContent('');
    setUrl('');
    setFile(null);
  };

  const validateForm = () => {
    switch (activeTab) {
      case 0: // Text
        if (!content.trim()) {
          setError('Content is required');
          return false;
        }
        break;
      case 1: // Image/GIF
      case 2: // Audio
        if (!file) {
          setError('Please select a file');
          return false;
        }
        break;
      case 3: // URL
        if (!url.trim()) {
          setError('URL is required');
          return false;
        }
        try {
          new URL(url); // Validate URL format
        } catch {
          setError('Please enter a valid URL');
          return false;
        }
        break;
    }
    return true;
  };

  const getFileMetadata = async (file) => {
    return new Promise((resolve) => {
      const metadata = {
        fileName: file.name,
        fileFormat: file.name.split('.').pop().toLowerCase(),
      };

      if (file.type.startsWith('image')) {
        const img = new Image();
        img.onload = () => {
          metadata.dimensions = `${img.width}x${img.height}`;
          if (metadata.fileFormat === 'gif') {
            // For GIFs, we'll estimate FPS based on file size and dimensions
            // This is a rough estimation
            const estimatedFrames = Math.floor(file.size / (img.width * img.height * 4));
            metadata.fps = Math.min(30, Math.max(10, estimatedFrames)); // Clamp between 10-30 fps
          }
          URL.revokeObjectURL(img.src);
          resolve(metadata);
        };
        img.src = URL.createObjectURL(file);
      } else if (file.type.startsWith('audio')) {
        const audio = new Audio();
        audio.onloadedmetadata = () => {
          metadata.duration = `${Math.floor(audio.duration)}s`;
          URL.revokeObjectURL(audio.src);
          resolve(metadata);
        };
        audio.src = URL.createObjectURL(file);
      } else {
        resolve(metadata);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();

      switch (activeTab) {
        case 0: // Text
          formData.append('type', 'text');
          formData.append('content', content.trim());
          break;

        case 1: // Image/GIF
        case 2: // Audio
          const metadata = await getFileMetadata(file);
          formData.append('type', activeTab === 1 ? 
            (metadata.fileFormat === 'gif' ? 'gif' : 'image') : 
            'audio'
          );
          formData.append('file', file);
          Object.entries(metadata).forEach(([key, value]) => {
            formData.append(key, value);
          });
          break;

        case 3: // URL
          formData.append('type', 'url');
          formData.append('content', url.trim());
          break;
      }

      const response = await uploadMemory(formData);
      console.log('Upload successful:', response);
      
      // Clear form
      setContent('');
      setUrl('');
      setFile(null);
      setSuccess(true);
      
      if (onUploadComplete) {
        onUploadComplete(response);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.error || error.message || 'Failed to upload memory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const getAcceptedFileTypes = () => {
    switch (activeTab) {
      case 1: // Image/GIF
        return 'image/*,.gif';
      case 2: // Audio
        return 'audio/*';
      default:
        return '';
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 600 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          Memory saved successfully!
        </Alert>
      )}

      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        variant="fullWidth" 
        sx={{ mb: 3 }}
      >
        <Tab icon={<TextFieldsIcon />} label="Text" />
        <Tab icon={<ImageIcon />} label="Image/GIF" />
        <Tab icon={<AudiotrackIcon />} label="Audio" />
        <Tab icon={<LinkIcon />} label="URL" />
      </Tabs>

      {activeTab === 0 && (
        <TextField
          fullWidth
          label="Memory Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          margin="normal"
          multiline
          rows={4}
          required
          error={!content && error}
          placeholder="Write your memory here..."
        />
      )}

      {(activeTab === 1 || activeTab === 2) && (
        <Box sx={{ my: 2 }}>
          <input
            accept={getAcceptedFileTypes()}
            style={{ display: 'none' }}
            id="memory-file-input"
            type="file"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          <label htmlFor="memory-file-input">
            <Button 
              variant="outlined" 
              component="span" 
              fullWidth
              startIcon={activeTab === 1 ? <ImageIcon /> : <AudiotrackIcon />}
            >
              {file ? `Selected: ${file.name}` : `Choose ${activeTab === 1 ? 'Image/GIF' : 'Audio'} File`}
            </Button>
          </label>
          {file && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Size: {(file.size / 1024 / 1024).toFixed(2)}MB
            </Typography>
          )}
        </Box>
      )}

      {activeTab === 3 && (
        <TextField
          fullWidth
          label="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          margin="normal"
          required
          error={!url && error}
          placeholder="Enter URL to save..."
        />
      )}

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Save Memory'}
      </Button>
    </Box>
  );
};

export default UploadForm;
