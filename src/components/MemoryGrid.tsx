import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Grid, Box, useTheme, Fade, Typography, CircularProgress, Button, Snackbar, Alert, RefreshIcon } from '@mui/material';
import MemoryCard from './MemoryCard';
import { Memory } from '../types/Memory';
import useMemoryStore from '../stores/memoryStore';

const MemoryGrid: React.FC = () => {
  const theme = useTheme();
  const { memories, addMemories, setMemories } = useMemoryStore();
  const [newMemories, setNewMemories] = useState<Memory[]>([]);
  const [voteError, setVoteError] = useState<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchNewMemories = useCallback(async () => {
    try {
      const lastMemoryTimestamp = memories.length > 0 
        ? new Date(memories[0].metadata.createdAt).getTime()
        : new Date().getTime();

      const response = await fetch('/.netlify/functions/getMemories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          after: lastMemoryTimestamp,
          limit: 50
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch new memories');
      
      const newData = await response.json();
      if (newData.memories && newData.memories.length > 0) {
        // Filter out duplicates
        const newUniqueMemories = newData.memories.filter(
          (newMem: Memory) => !memories.some(
            existingMem => existingMem._id === newMem._id
          )
        );

        if (newUniqueMemories.length > 0) {
          setNewMemories(prev => [...newUniqueMemories, ...prev]);
          // Animate new memories in after a brief delay
          setTimeout(() => {
            addMemories(newUniqueMemories);
            setNewMemories([]);
          }, 300);
        }
      }
    } catch (error) {
      console.error('Error fetching new memories:', error);
    }
  }, [memories, addMemories]);

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
      if (addMemories) {
        addMemories([memory]);
      }
    } catch (error) {
      setVoteError(error instanceof Error ? error.message : 'Failed to vote');
      throw error;
    }
  };

  // Initial fetch
  useEffect(() => {
    const fetchInitialMemories = async () => {
      try {
        const response = await fetch('/.netlify/functions/getMemories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            limit: 50
          }),
        });

        if (!response.ok) throw new Error('Failed to fetch initial memories');
        
        const data = await response.json();
        if (data.memories) {
          setMemories(data.memories);
        }
      } catch (error) {
        console.error('Error fetching initial memories:', error);
      }
    };

    fetchInitialMemories();
  }, [setMemories]);

  // Set up polling for new memories
  useEffect(() => {
    pollingInterval.current = setInterval(fetchNewMemories, 5000); // Poll every 5 seconds

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [fetchNewMemories]);

  return (
    <Box sx={{ 
      flexGrow: 1, 
      padding: theme.spacing(2),
      overflow: 'hidden'
    }}>
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
      <Grid container spacing={2}>
        {/* New memories that will be animated in */}
        {newMemories.map((memory) => (
          <Fade
            key={`new-${memory._id}`}
            in={true}
            timeout={500}
          >
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <MemoryCard memory={memory} isNew={true} onVote={handleVote} />
            </Grid>
          </Fade>
        ))}
        
        {/* Existing memories */}
        {memories.map((memory) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={memory._id}>
            <MemoryCard memory={memory} onVote={handleVote} />
          </Grid>
        ))}
      </Grid>
      {memories.length === 0 && newMemories.length === 0 && (
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
