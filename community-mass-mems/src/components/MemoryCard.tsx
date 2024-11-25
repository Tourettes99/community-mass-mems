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

      const { votes } = await response.json();
      updateMemory({ ...memory, votes });
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date available';
    
    try {
      // First try parsing as ISO string
      const date = new Date(dateString);
      
      // Validate the date
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid date';
      }

      // Format the date
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
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
          {memory.tags?.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Created: {formatDate(memory.metadata?.createdAt)}
        </Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box>
          <Tooltip title="Like">
            <IconButton onClick={() => handleVote('up')} size="small">
              <ThumbUpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography variant="body2" component="span" sx={{ mx: 1 }}>
            {memory.votes.up}
          </Typography>
          <Tooltip title="Dislike">
            <IconButton onClick={() => handleVote('down')} size="small">
              <ThumbDownIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography variant="body2" component="span" sx={{ ml: 1 }}>
            {memory.votes.down}
          </Typography>
        </Box>
        {memory.url && (
          <Tooltip title="Open in new tab">
            <IconButton 
              component={Link} 
              href={memory.url} 
              target="_blank" 
              rel="noopener noreferrer"
              size="small"
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </CardActions>
    </Card>
  );
};

export default MemoryCard;
