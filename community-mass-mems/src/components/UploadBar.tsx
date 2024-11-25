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
  SelectChangeEvent,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import LinkIcon from '@mui/icons-material/Link';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import { Memory } from '../types';
import useMemoryStore from '../stores/memoryStore';

type MemoryType = 'text' | 'url';

const UploadBar: React.FC = () => {
  const addMemories = useMemoryStore(state => state.addMemories);
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
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleTagDelete = (tagToDelete: string) => {
    setTags(tags.filter(tag => tag !== tagToDelete));
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && currentTag.trim()) {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/uploadUrl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          url: type === 'url' ? url : undefined,
          content: type === 'text' ? content : undefined,
          tags
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload memory');
      }

      const newMemory = await response.json();
      addMemories([newMemory]);
      setSuccess(true);
      setUrl('');
      setContent('');
      setTags([]);
    } catch (err) {
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
            placeholder="Enter a URL (e.g., YouTube, Instagram, etc.)"
            InputProps={{
              startAdornment: getTypeIcon(type)
            }}
          />
        )}

        {/* Text Input */}
        {type === 'text' && (
          <TextField
            fullWidth
            label="Content"
            value={content}
            onChange={handleContentChange}
            multiline
            rows={4}
            placeholder="Enter your memory text here..."
          />
        )}

        {/* Tags Input */}
        <Box>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Tags (press Enter or click + to add)
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              label="Add Tag"
              value={currentTag}
              onChange={handleTagChange}
              onKeyPress={handleKeyPress}
              placeholder="Enter tag..."
              sx={{ flexGrow: 1 }}
            />
            <IconButton 
              onClick={handleTagAdd}
              disabled={!currentTag.trim()}
              color="primary"
              size="small"
            >
              <AddIcon />
            </IconButton>
          </Stack>
          
          {/* Tags Display */}
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                onDelete={() => handleTagDelete(tag)}
                color="primary"
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        </Box>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading || (!url && !content) || (type === 'url' && !url) || (type === 'text' && !content)}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Uploading...' : 'Upload Memory'}
        </Button>
      </Stack>

      {/* Error Snackbar */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success">
          Memory uploaded successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UploadBar;
