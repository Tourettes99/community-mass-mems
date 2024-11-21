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

type FileType = keyof FileTypes;
type MemoryType = FileType | 'text' | 'url';

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

const isFileType = (type: MemoryType): type is FileType => {
  return type in SUPPORTED_FILE_TYPES;
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
      // Read file content directly
      if (file.type.includes('text')) {
        const text = await file.text();
        setContent(text);
        setType('text');
      } else {
        // For now, just store the file name as URL
        // In a real app, you'd upload the file to a storage service
        setUrl(file.name);
        
        // Set type based on file type
        if (file.type.includes('image')) setType('image');
        else if (file.type.includes('video')) setType('video');
        else if (file.type.includes('audio')) setType('audio');
        else setType('static');
      }

      setSuccess(true);
    } catch (error) {
      console.error('Error processing file:', error);
      setError(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Submitting memory:', { type, url, content, tags });
      
      const requestBody = {
        type,
        url,
        content,
        tags
      };

      const response = await fetch('/.netlify/functions/file-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload memory');
      }

      const data = await response.json();
      console.log('Server response:', data);
      
      onMemoryCreated(data.memory);
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
                  accept={isFileType(type) ? SUPPORTED_FILE_TYPES[type].join(',') : undefined}
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
