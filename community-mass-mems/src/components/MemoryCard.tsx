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
  const [userVote, setUserVote] = React.useState<string | null>(
    localStorage.getItem(`vote_${memory._id}`)
  );

  const handleVote = async (type: 'up' | 'down') => {
    try {
      // Generate a persistent user ID if not exists
      let userId = localStorage.getItem('userId');
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
      }

      const response = await fetch('/.netlify/functions/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memoryId: memory._id,
          voteType: type,
          userId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      const { votes, userVote } = await response.json();
      
      // Update local storage with user's vote
      if (userVote) {
        localStorage.setItem(`vote_${memory._id}`, userVote);
      } else {
        localStorage.removeItem(`vote_${memory._id}`);
      }
      
      setUserVote(userVote);
      updateMemory({ ...memory, votes });
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date available';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
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
          <Tooltip title={userVote === 'up' ? 'Undo like' : 'Like'}>
            <IconButton 
              onClick={() => handleVote('up')} 
              size="small"
              color={userVote === 'up' ? 'primary' : 'default'}
            >
              <ThumbUpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography variant="body2" component="span" sx={{ mx: 1 }}>
            {memory.votes.up}
          </Typography>
          <Tooltip title={userVote === 'down' ? 'Undo dislike' : 'Dislike'}>
            <IconButton 
              onClick={() => handleVote('down')} 
              size="small"
              color={userVote === 'down' ? 'error' : 'default'}
            >
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
