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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
    if (!title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!description.trim()) {
      setError('Description is required');
      return false;
    }

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
      formData.append('title', title.trim());
      formData.append('description', description.trim());

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
      setTitle('');
      setDescription('');
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

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          margin="normal"
          multiline
          rows={2}
          required
        />
      </Box>

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
          label="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          multiline
          rows={4}
          required
        />
      )}

      {(activeTab === 1 || activeTab === 2) && (
        <input
          type="file"
          accept={activeTab === 1 ? 'image/*,.gif' : 'audio/*'}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          ref={fileInputRef}
        />
      )}

      {(activeTab === 1 || activeTab === 2) && (
        <Box>
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
            fullWidth
          >
            {file ? file.name : `Choose ${activeTab === 1 ? 'Image' : 'Audio'} File`}
          </Button>
        </Box>
      )}

      {activeTab === 3 && (
        <TextField
          fullWidth
          label="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
      )}

      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={loading}
        sx={{ mt: 3 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Upload Memory'}
      </Button>
    </Box>
  );
};

export default UploadForm;
