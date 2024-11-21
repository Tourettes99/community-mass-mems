import React, { useState } from 'react';
import { Box, Button, TextField, Typography, CircularProgress, Alert } from '@mui/material';
import { uploadMemory } from '../api';

const UploadForm = ({ onUploadComplete }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    if (!title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!description.trim()) {
      setError('Description is required');
      return false;
    }
    if (!file && !mediaUrl) {
      setError('Please provide either a file or a media URL');
      return false;
    }
    return true;
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
      
      if (file) {
        formData.append('file', file);
      }
      
      if (mediaUrl) {
        formData.append('mediaUrl', mediaUrl.trim());
        formData.append('mediaType', 'url');
      }

      console.log('Submitting memory:', {
        title,
        description,
        file: file ? file.name : 'No file',
        mediaUrl
      });

      const response = await uploadMemory(formData);
      console.log('Upload successful:', response);
      
      // Clear form
      setTitle('');
      setDescription('');
      setFile(null);
      setMediaUrl('');
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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setMediaUrl(''); // Clear media URL when file is selected
    }
  };

  const handleMediaUrlChange = (e) => {
    setMediaUrl(e.target.value);
    if (file) {
      setFile(null); // Clear file when media URL is entered
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
          Memory uploaded successfully!
        </Alert>
      )}

      <TextField
        fullWidth
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        margin="normal"
        required
        error={!title && error}
      />

      <TextField
        fullWidth
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        margin="normal"
        multiline
        rows={3}
        required
        error={!description && error}
      />

      <Box sx={{ my: 2 }}>
        <input
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          style={{ display: 'none' }}
          id="file-input"
          type="file"
          onChange={handleFileChange}
        />
        <label htmlFor="file-input">
          <Button variant="outlined" component="span" fullWidth>
            {file ? `Selected: ${file.name}` : 'Choose File'}
          </Button>
        </label>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
        OR
      </Typography>

      <TextField
        fullWidth
        label="Media URL"
        value={mediaUrl}
        onChange={handleMediaUrlChange}
        margin="normal"
        placeholder="Enter URL for image, video, or document"
      />

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Upload Memory'}
      </Button>
    </Box>
  );
};

export default UploadForm;
