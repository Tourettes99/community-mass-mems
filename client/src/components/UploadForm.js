import React, { useState } from 'react';
import { Box, Button, TextField, Typography, CircularProgress, Alert } from '@mui/material';
import { uploadMemory } from '../api';

const UploadForm = ({ onUploadComplete }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    if (!content.trim()) {
      setError('Content is required');
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
      formData.append('type', 'text');
      formData.append('content', content.trim());

      console.log('Submitting memory:', {
        type: 'text',
        content: content.trim()
      });

      const response = await uploadMemory(formData);
      console.log('Upload successful:', response);
      
      // Clear form
      setContent('');
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
