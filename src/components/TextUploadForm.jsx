import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Stack
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

const TextUploadForm = ({ onUpload }) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'text',
          content: text,
          metadata: {
            title: title || 'Text Note',
            type: 'text',
            description: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
            content: text,
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload text');
      }

      const data = await response.json();
      setText('');
      setTitle('');
      if (onUpload) onUpload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper 
      component="form" 
      onSubmit={handleSubmit}
      sx={{ 
        p: 3,
        mb: 3,
        borderRadius: 2,
        boxShadow: 2
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h6" gutterBottom>
          Add Text Note
        </Typography>

        <TextField
          label="Title (Optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
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
        />

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !text.trim()}
            endIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            Post
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
};

export default TextUploadForm;
