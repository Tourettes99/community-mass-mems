import React, { useEffect, useCallback } from 'react';
import { Grid, Box, useTheme, Fade, CircularProgress, Typography, Alert } from '@mui/material';
import MemoryCard from './MemoryCard';
import { Memory } from '../types/Memory';
import useMemoryStore from '../stores/memoryStore';

const MemoryGrid: React.FC = () => {
  const theme = useTheme();
  const { memories, loading, error, setMemories, setLoading, setError } = useMemoryStore();

  const fetchMemories = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const response = await fetch('/.netlify/functions/getMemories');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMemories(data);
    } catch (err) {
      console.error('Error fetching memories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch memories');
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [setMemories, setLoading, setError]);

  useEffect(() => {
    fetchMemories(false);

    const intervalId = setInterval(() => {
      fetchMemories(true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchMemories]);

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      {loading && memories.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : memories.length === 0 ? (
        <Typography variant="h6" align="center" color="text.secondary" sx={{ p: 4 }}>
          No memories yet. Be the first to share one!
        </Typography>
      ) : (
        <Fade in={true}>
          <Grid container spacing={3}>
            {memories.map((memory) => (
              <Grid item xs={12} sm={6} md={4} key={memory._id}>
                <MemoryCard memory={memory} />
              </Grid>
            ))}
          </Grid>
        </Fade>
      )}
    </Box>
  );
};

export default MemoryGrid;
