import React, { useState } from 'react';
import { Box, Button, TextField, Typography, CircularProgress } from '@mui/material';
import { uploadMemory } from '../api';

const UploadForm = ({ onUploadComplete }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      
      if (file) {
        formData.append('file', file);
      }
      
      if (mediaUrl) {
        formData.append('mediaUrl', mediaUrl);
        formData.append('mediaType', 'url');
      }

      const response = await uploadMemory(formData);
      console.log('Upload successful:', response);
      
      // Clear form
      setTitle('');
      setDescription('');
      setFile(null);
      setMediaUrl('');
      
      if (onUploadComplete) {
        onUploadComplete(response);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload memory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMediaUrl(''); // Clear URL when file is selected
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <TextField
        fullWidth
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        margin="normal"
      />
      
      <TextField
        fullWidth
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        multiline
        rows={4}
        margin="normal"
      />
      
      <Box sx={{ mt: 2, mb: 2 }}>
        <input
          accept="image/*,video/*,audio/*"
          style={{ display: 'none' }}
          id="file-upload"
          type="file"
          onChange={handleFileChange}
        />
        <label htmlFor="file-upload">
          <Button variant="outlined" component="span">
            Choose File
          </Button>
        </label>
        {file && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Selected file: {file.name}
          </Typography>
        )}
      </Box>

      <TextField
        fullWidth
        label="Media URL (optional)"
        value={mediaUrl}
        onChange={(e) => {
          setMediaUrl(e.target.value);
          setFile(null); // Clear file when URL is entered
        }}
        margin="normal"
        helperText="Enter a URL for external media (image, video, etc.)"
      />

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={loading || (!file && !mediaUrl && !description)}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Upload Memory'}
      </Button>
    </Box>
  );
};

export default UploadForm;
