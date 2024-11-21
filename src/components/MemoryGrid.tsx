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
}

const MemoryGrid: React.FC<MemoryGridProps> = ({
  memories = [],
  loading = false,
  error = null,
  onRefresh,
  isBackgroundRefresh = false
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

      await response.json();
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

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
        {onRefresh && (
          <Button
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            variant="contained"
          >
            Retry
          </Button>
        )}
      </Box>
    );
  }

  if (!memories.length) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No memories found
        </Typography>
        {onRefresh && (
          <Button
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            variant="contained"
            sx={{ mt: 2 }}
          >
            Refresh
          </Button>
        )}
      </Box>
    );
  }

  return (
    <>
      <Grid container spacing={2}>
        {memories.map((memory) => (
          <Grid key={memory._id} item xs={12} sm={6} md={4}>
            <MemoryCard memory={memory} onVote={handleVote} />
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={!!voteError}
        autoHideDuration={6000}
        onClose={() => setVoteError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setVoteError(null)} severity="error">
          {voteError}
        </Alert>
      </Snackbar>
    </>
  );
};

export default MemoryGrid;
