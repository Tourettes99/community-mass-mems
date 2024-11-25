import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  TextField,
  Button,
  Box,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { RAL_2005 } from '../theme';

interface UploadBarProps {
  onUpload: (type: string, content: string, tags: string[]) => Promise<void>;
}

const UploadBar: React.FC<UploadBarProps> = ({ onUpload }) => {
  const theme = useTheme();
  const [content, setContent] = useState('');
  const [currentTag, setCurrentTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);

  const handleSubmit = async () => {
    if (!content) {
      setError('Please enter a URL or text content');
      return;
    }

    try {
      const type = content.startsWith('http') ? 'url' : 'text';
      await onUpload(type, content, tags);
      setContent('');
      setTags([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload memory');
    }
  };

  const handleAddTag = () => {
    if (currentTag.trim()) {
      if (!tags.includes(currentTag.trim())) {
        setTags([...tags, currentTag.trim()]);
      }
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <AppBar 
      position="static" 
      elevation={1}
      sx={{ 
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'background.paper' 
          : '#ffffff',
        borderRadius: 2,
        mb: 3,
        color: 'text.primary'
      }}
    >
      <Toolbar sx={{ flexWrap: 'wrap', gap: 2, py: 2 }}>
        <TextField
          fullWidth
          placeholder="Enter URL or text..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
          error={!!error}
          helperText={error}
          sx={{ 
            flexGrow: 1,
            '& .MuiOutlinedInput-root': {
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(0, 0, 0, 0.02)',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.04)',
              }
            }
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title="Add Tags">
            <IconButton
              onClick={() => setIsTagDialogOpen(true)}
              sx={{ 
                color: tags.length > 0 ? RAL_2005 : 'text.secondary',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? `${RAL_2005}40`
                    : `${RAL_2005}20`,
                }
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              backgroundColor: RAL_2005,
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#c23900',
              }
            }}
          >
            Share Memory
          </Button>
        </Box>
        {tags.length > 0 && (
          <Stack 
            direction="row" 
            spacing={1} 
            sx={{ 
              width: '100%', 
              flexWrap: 'wrap',
              gap: 1,
              '& > *': { my: 0.5 }
            }}
          >
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                sx={{
                  backgroundColor: theme.palette.mode === 'dark'
                    ? `${RAL_2005}40`
                    : `${RAL_2005}20`,
                  color: theme.palette.text.primary,
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark'
                      ? `${RAL_2005}60`
                      : `${RAL_2005}30`,
                  },
                  '& .MuiChip-deleteIcon': {
                    color: theme.palette.text.secondary,
                    '&:hover': {
                      color: theme.palette.text.primary,
                    }
                  }
                }}
              />
            ))}
          </Stack>
        )}
      </Toolbar>

      <Dialog 
        open={isTagDialogOpen} 
        onClose={() => setIsTagDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'background.paper' 
              : '#ffffff',
          }
        }}
      >
        <DialogTitle sx={{ color: 'text.primary' }}>
          Add Tags
          <IconButton
            aria-label="close"
            onClick={() => setIsTagDialogOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              placeholder="Enter a tag..."
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyPress={handleTagKeyPress}
              sx={{ mb: 2 }}
            />
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ 
                flexWrap: 'wrap',
                gap: 1,
                '& > *': { my: 0.5 }
              }}
            >
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  sx={{
                    backgroundColor: theme.palette.mode === 'dark'
                      ? `${RAL_2005}40`
                      : `${RAL_2005}20`,
                    color: theme.palette.text.primary,
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark'
                        ? `${RAL_2005}60`
                        : `${RAL_2005}30`,
                    },
                    '& .MuiChip-deleteIcon': {
                      color: theme.palette.text.secondary,
                      '&:hover': {
                        color: theme.palette.text.primary,
                      }
                    }
                  }}
                />
              ))}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTagDialogOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};

export default UploadBar;
