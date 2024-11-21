import React, { useState, useRef, ChangeEvent, KeyboardEvent, FormEvent } from 'react';
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
  MenuItem,
  SelectChangeEvent,
  TextFieldProps
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
import { Memory } from '../types';

type MemoryType = 'text' | 'audio' | 'video' | 'image' | 'url' | 'static';

interface FileTypes {
  image: string[];
  video: string[];
  audio: string[];
  static: string[];
}

const SUPPORTED_FILE_TYPES: FileTypes = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'],
  video: ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.m4v'],
  audio: ['.mp3', '.wav', '.aac', '.ogg', '.m4a', '.flac', '.wma'],
  static: ['.txt', '.html', '.json', '.xml', '.md', '.csv']
};

const Input = styled('input')({
  display: 'none'
});

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      // Validate file type
      const fileExtension = file.name.split('.').pop();
      if (!fileExtension) {
        setError('Invalid file: no file extension found');
        return;
      }

      const ext = '.' + fileExtension.toLowerCase();
      const fileType = Object.entries(SUPPORTED_FILE_TYPES).find(([_, exts]) => exts.includes(ext))?.[0];

      if (!fileType) {
        setError(`Unsupported file type. Supported types: ${Object.values(SUPPORTED_FILE_TYPES).flat().join(', ')}`);
        return;
      }

      // Create a signed URL or handle file upload here
      // For now, we'll just use a local URL
      const objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
      setType(fileType as MemoryType);

      // For static text files, read content
      if (fileType === 'static' && file.type.includes('text')) {
        const text = await file.text();
        setContent(text);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('url', url);
      formData.append('content', content);
      formData.append('tags', JSON.stringify(tags));

      const response = await fetch('/.netlify/functions/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload memory');
      }

      const data: Memory = await response.json();
      onMemoryCreated(data);
      setSuccess(true);
      setUrl('');
      setContent('');
      setTags([]);
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
      case 'image':
        return <ImageIcon />;
      case 'video':
        return <VideoFileIcon />;
      case 'audio':
        return <AudioFileIcon />;
      case 'static':
        return <InsertDriveFileIcon />;
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
              onChange={handleUrlChange}
              InputProps={{
                startAdornment: getTypeIcon(type)
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
                  accept={type !== 'text' && type !== 'url' ? SUPPORTED_FILE_TYPES[type as keyof typeof SUPPORTED_FILE_TYPES]?.join(',') : undefined}
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
