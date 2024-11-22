import React, { useState, ChangeEvent, KeyboardEvent, FormEvent } from 'react';
import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import LinkIcon from '@mui/icons-material/Link';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import { Memory } from '../types';

type MemoryType = 'text' | 'url';

interface UploadBarProps {
  onMemoryCreated: (memory: Memory) => void;
}

const UploadBar: React.FC<UploadBarProps> = ({ onMemoryCreated }) => {
  const [type, setType] = useState<MemoryType>('url');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTypeChange = (event: SelectChangeEvent<MemoryType>) => {
    const newType = event.target.value as MemoryType;
    setType(newType);
    setUrl('');
    setContent('');
  };

  const handleTagAdd = () => {
    if (currentTag && !tags.includes(currentTag)) {
      setTags([...tags, currentTag]);
      setCurrentTag('');
    }
  };

  const handleTagDelete = (tagToDelete: string) => {
    setTags(tags.filter(tag => tag !== tagToDelete));
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && currentTag) {
      event.preventDefault();
      handleTagAdd();
    }
  };

  const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  };

  const handleContentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setContent(event.target.value);
  };

  const handleTagChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCurrentTag(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Submitting memory:', { type, url, content, tags });
      
      if (type === 'url') {
        if (!url.trim()) {
          throw new Error('URL is required');
        }
        
        // Send URL to uploadUrl endpoint
        const response = await fetch('/.netlify/functions/uploadUrl', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: url.trim() })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to upload URL');
        }

        const data = await response.json();
        onMemoryCreated(data);
      } else if (type === 'text') {
        if (!content) {
          throw new Error('Content is required for text type memories');
        }
        
        // Send text content to upload endpoint
        const formData = new FormData();
        formData.append('content', content);
        
        const response = await fetch('/.netlify/functions/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to upload content');
        }

        const data = await response.json();
        onMemoryCreated(data);
      } else {
        throw new Error('No content provided');
      }

      setSuccess(true);
      
      // Reset form
      setUrl('');
      setContent('');
      setTags([]);
      setCurrentTag('');
      setType('url');
    } catch (err) {
      console.error('Error uploading memory:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload memory');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (memoryType: MemoryType) => {
    switch (memoryType) {
      case 'url':
        return <LinkIcon />;
      case 'text':
        return <TextFieldsIcon />;
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mb: 2 }}>
      <Stack spacing={2}>
        {/* Memory Type Selection */}
        <FormControl fullWidth>
          <InputLabel>Memory Type</InputLabel>
          <Select
            value={type}
            onChange={handleTypeChange}
            label="Memory Type"
            startAdornment={getTypeIcon(type)}
          >
            <MenuItem value="url">URL</MenuItem>
            <MenuItem value="text">Text</MenuItem>
          </Select>
        </FormControl>

        {/* URL Input */}
        {type === 'url' && (
          <TextField
            fullWidth
            label="URL"
            value={url}
            onChange={handleUrlChange}
            InputProps={{
              startAdornment: getTypeIcon(type)
            }}
          />
        )}

        {/* Text Content Input */}
        {type === 'text' && (
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Text Content"
            value={content}
            onChange={handleContentChange}
          />
        )}

        {/* Tags Input */}
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Add Tags"
              value={currentTag}
              onChange={handleTagChange}
              onKeyPress={handleKeyPress}
              size="small"
            />
            <IconButton onClick={handleTagAdd} disabled={!currentTag}>
              <AddIcon />
            </IconButton>
          </Stack>
          {tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  onDelete={() => handleTagDelete(tag)}
                  deleteIcon={<ClearIcon />}
                />
              ))}
            </Box>
          )}
        </Stack>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          disabled={loading || (!url && !content)}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          Create Memory
        </Button>
      </Stack>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Memory created successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UploadBar;
