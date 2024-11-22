import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  IconButton,
  CardActions,
  Link,
  Tooltip
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Memory } from '../types/Memory';
import useMemoryStore from '../stores/memoryStore';

interface MemoryCardProps {
  memory: Memory;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory }) => {
  const updateMemory = useMemoryStore(state => state.updateMemory);

  const handleVote = async (type: 'up' | 'down') => {
    try {
      const response = await fetch('/.netlify/functions/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memoryId: memory._id,
          voteType: type
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      const updatedMemory = await response.json();
      updateMemory(updatedMemory);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {memory.metadata.thumbnailUrl && (
        <CardMedia
          component="img"
          height="140"
          image={memory.metadata.thumbnailUrl}
          alt={memory.metadata.title || 'Memory thumbnail'}
          sx={{ objectFit: 'cover' }}
        />
      )}
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          {memory.metadata.title || 'Untitled Memory'}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {memory.metadata.description || (memory.type === 'text' ? memory.content : '')}
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {memory.tags.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          {memory.metadata.createdAt ? formatDate(memory.metadata.createdAt) : 'No date available'}
        </Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 1 }}>
        <Box>
          <Tooltip title="Upvote">
            <IconButton onClick={() => handleVote('up')} size="small">
              <ThumbUpIcon color={memory.votes.up > 0 ? 'primary' : 'inherit'} />
            </IconButton>
          </Tooltip>
          <Typography variant="body2" component="span" sx={{ px: 1 }}>
            {memory.votes.up - memory.votes.down}
          </Typography>
          <Tooltip title="Downvote">
            <IconButton onClick={() => handleVote('down')} size="small">
              <ThumbDownIcon color={memory.votes.down > 0 ? 'error' : 'inherit'} />
            </IconButton>
          </Tooltip>
        </Box>
        {memory.type === 'url' && memory.url && (
          <Tooltip title="Open link in new tab">
            <IconButton
              component={Link}
              href={memory.url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
            >
              <OpenInNewIcon />
            </IconButton>
          </Tooltip>
        )}
      </CardActions>
    </Card>
  );
};

export default MemoryCard;
