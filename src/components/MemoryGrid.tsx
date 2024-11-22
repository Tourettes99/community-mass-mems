import React, { useState } from 'react';
import { Grid, Box, Typography, CircularProgress, Button, Snackbar, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MemoryCard from './MemoryCard';
import { Memory } from '../types';

interface MemoryGridProps {
  memories: Memory[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  isBackgroundRefresh?: boolean;
  onMemoryUpdate?: (updatedMemory: Memory) => void;
}

const MemoryGrid: React.FC<MemoryGridProps> = ({
  memories = [],
  loading = false,
  error = null,
  onRefresh,
  isBackgroundRefresh = false,
  onMemoryUpdate
}) => {
  const [voteError, setVoteError] = useState<string | null>(null);

  const handleVote = async (memoryId: string, vote: 1 | -1) => {
    try {
      const response = await fetch('/.netlify/functions/vote-memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memoryId, vote })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to vote');
      }

      const { memory } = await response.json();
      
      // Update the memory in the parent component if callback is provided
      if (onMemoryUpdate) {
        onMemoryUpdate(memory);
      }
    } catch (error) {
      setVoteError(error instanceof Error ? error.message : 'Failed to vote');
      throw error;
    }
  };

  if (loading && !isBackgroundRefresh) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {voteError && (
        <Snackbar 
          open={!!voteError} 
          autoHideDuration={6000} 
          onClose={() => setVoteError(null)}
        >
          <Alert 
            onClose={() => setVoteError(null)} 
            severity="error"
          >
            {voteError}
          </Alert>
        </Snackbar>
      )}

      {onRefresh && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      )}

      <Grid container spacing={3}>
        {memories.map((memory) => (
          <Grid item xs={12} sm={6} md={4} key={memory._id}>
            <MemoryCard 
              memory={memory} 
              onVote={handleVote}
            />
          </Grid>
        ))}
      </Grid>

      {memories.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No memories found. Share something with your community!
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MemoryGrid;
