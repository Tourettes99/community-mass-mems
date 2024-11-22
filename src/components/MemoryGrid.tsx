import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Grid, Box, useTheme, Fade, CircularProgress, Typography } from '@mui/material';
import MemoryCard from './MemoryCard';
import { Memory } from '../types/Memory';
import useMemoryStore from '../stores/memoryStore';

const MemoryGrid: React.FC = () => {
  const theme = useTheme();
  const { memories, addMemories, setMemories } = useMemoryStore();
  const [newMemories, setNewMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError('Failed to fetch new memories');
    }
  }, [memories, addMemories]);

  // Initial fetch
  useEffect(() => {
    const fetchInitialMemories = async () => {
      setLoading(true);
      setError(null);
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
        setError('Failed to load memories');
      } finally {
        setLoading(false);
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      flexGrow: 1, 
      padding: theme.spacing(2),
      overflow: 'hidden'
    }}>
      <Grid container spacing={2}>
        {/* New memories that will be animated in */}
        {newMemories.map((memory) => (
          <Fade
            key={`new-${memory._id}`}
            in={true}
            timeout={500}
          >
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <MemoryCard memory={memory} isNew={true} />
            </Grid>
          </Fade>
        ))}
        
        {/* Existing memories */}
        {memories.map((memory) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={memory._id}>
            <MemoryCard memory={memory} />
          </Grid>
        ))}

        {memories.length === 0 && newMemories.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No memories found. Share something with your community!
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default MemoryGrid;
