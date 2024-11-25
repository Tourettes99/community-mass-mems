import React, { useState, useEffect } from 'react';
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
  LinearProgress,
  Typography,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { RAL_2005 } from '../theme';
import { WeeklyStats } from '../types/Memory';

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
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    postsThisWeek: 0,
    weeklyLimit: 35,
    nextReset: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWeeklyStats();
    const interval = setInterval(fetchWeeklyStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchWeeklyStats = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-weekly-stats');
      if (response.ok) {
        const stats = await response.json();
        setWeeklyStats(stats);
      }
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
    }
  };

  const handleSubmit = async () => {
    if (!content) {
      setError('Please enter a URL or text content');
      return;
    }

    if (weeklyStats.postsThisWeek >= weeklyStats.weeklyLimit) {
      setError('Weekly post limit reached. Please try again after Sunday reset.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const type = content.startsWith('http') ? 'url' : 'text';
      await onUpload(type, content, tags);
      setContent('');
      setTags([]);
      setError(null);
      // Show success message
      alert('Your post has been submitted for moderation. It will be reviewed within 3 days.');
      fetchWeeklyStats(); // Refresh stats after successful upload
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload memory');
    } finally {
      setLoading(false);
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

  const progressPercentage = (weeklyStats.postsThisWeek / weeklyStats.weeklyLimit) * 100;
  const remainingPosts = weeklyStats.weeklyLimit - weeklyStats.postsThisWeek;

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
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Weekly Community Posts
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={progressPercentage}
              sx={{
                height: 10,
                borderRadius: 5,
                flexGrow: 1,
                mr: 2,
                backgroundColor: 'rgba(255, 87, 34, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#ff5722', // RAL 2005 bright orange
                }
              }}
            />
            <Typography variant="body2" color="textSecondary">
              {weeklyStats.postsThisWeek}/{weeklyStats.weeklyLimit}
            </Typography>
          </Box>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {remainingPosts} posts remaining this week • Resets {weeklyStats.nextReset}
          </Typography>
        </Box>
        <TextField
          fullWidth
          placeholder="Enter URL or text..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
          error={!!error}
          helperText={error}
          disabled={loading || weeklyStats.postsThisWeek >= weeklyStats.weeklyLimit}
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
            disabled={loading || !content.trim() || weeklyStats.postsThisWeek >= weeklyStats.weeklyLimit}
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

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mt: 2 }} />}
    </AppBar>
  );
};

export default UploadBar;
