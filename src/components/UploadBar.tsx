import React, { useState, useRef } from 'react';
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
  Tooltip,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import LinkIcon from '@mui/icons-material/Link';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { styled } from '@mui/material/styles';

const SUPPORTED_FILE_TYPES = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'],
  video: ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.m4v'],
  audio: ['.mp3', '.wav', '.aac', '.ogg', '.m4a', '.flac', '.wma'],
  static: ['.txt', '.html', '.json', '.xml', '.md', '.csv']
};

const Input = styled('input')({
  display: 'none'
});

const UploadBar = ({ onMemoryCreated }) => {
  const [type, setType] = useState('url');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleTypeChange = (event) => {
    setType(event.target.value);
    setUrl('');
    setContent('');
  };

  const handleTagAdd = () => {
    if (currentTag && !tags.includes(currentTag)) {
      setTags([...tags, currentTag]);
      setCurrentTag('');
    }
  };

  const handleTagDelete = (tagToDelete) => {
    setTags(tags.filter(tag => tag !== tagToDelete));
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && currentTag) {
      event.preventDefault();
      handleTagAdd();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const fileType = Object.entries(SUPPORTED_FILE_TYPES).find(([_, exts]) => exts.includes(ext))?.[0];
    
    if (!fileType) {
      setError(`Unsupported file type. Supported types: ${Object.values(SUPPORTED_FILE_TYPES).flat().join(', ')}`);
      return;
    }

    try {
      // Create a signed URL or handle file upload here
      // For now, we'll just use a local URL
      const objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
      setType(fileType);

      // For static text files, read content
      if (fileType === 'static' && file.type.includes('text')) {
        const text = await file.text();
        setContent(text);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Failed to process file');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          url: type === 'text' ? null : url,
          content: type === 'text' ? content : null,
          tags
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create memory');
      }

      setSuccess(true);
      setUrl('');
      setContent('');
      setTags([]);
      onMemoryCreated(data.memory);
    } catch (error) {
      console.error('Error creating memory:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getInputIcon = () => {
    switch (type) {
      case 'url': return <LinkIcon />;
      case 'text': return <TextFieldsIcon />;
      case 'image': return <ImageIcon />;
      case 'video': return <VideoFileIcon />;
      case 'audio': return <AudioFileIcon />;
      case 'static': return <InsertDriveFileIcon />;
      default: return <LinkIcon />;
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
            startAdornment={getInputIcon()}
          >
            <MenuItem value="url">URL</MenuItem>
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="image">Image</MenuItem>
            <MenuItem value="video">Video</MenuItem>
            <MenuItem value="audio">Audio</MenuItem>
            <MenuItem value="static">Static File</MenuItem>
          </Select>
        </FormControl>

        {/* URL or File Upload Input */}
        {type !== 'text' && (
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              label={`${type.charAt(0).toUpperCase() + type.slice(1)} URL`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              InputProps={{
                startAdornment: getInputIcon()
              }}
            />
            <Tooltip title={`Upload ${type} file`}>
              <Button
                variant="outlined"
                component="label"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept={SUPPORTED_FILE_TYPES[type]?.join(',')}
                />
              </Button>
            </Tooltip>
          </Stack>
        )}

        {/* Text Content Input */}
        {type === 'text' && (
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Text Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        )}

        {/* Tags Input */}
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Add Tags"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
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
