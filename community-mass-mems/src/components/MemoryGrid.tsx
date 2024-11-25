import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { Grid, Box, useTheme, Fade, CircularProgress, Typography, Alert } from '@mui/material';
import MemoryCard from './MemoryCard';
import TagFilter from './TagFilter';
import { Memory } from '../types/Memory';
import useMemoryStore from '../stores/memoryStore';

const MemoryGrid: React.FC = () => {
  const theme = useTheme();
  const { memories, loading, error, setMemories, setLoading, setError } = useMemoryStore();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  // Get all unique tags from memories
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    memories.forEach(memory => {
      memory.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [memories]);

  // Filter memories based on selected tags
  const filteredMemories = useMemo(() => {
    if (selectedTags.length === 0) return memories;
    return memories.filter(memory => 
      selectedTags.every(tag => memory.tags?.includes(tag))
    );
  }, [memories, selectedTags]);

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
        <>
          <TagFilter
            availableTags={availableTags}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />
          <Fade in={true}>
            <Grid container spacing={3}>
              {filteredMemories.map((memory) => (
                <Grid item xs={12} sm={6} md={4} key={memory._id}>
                  <MemoryCard memory={memory} />
                </Grid>
              ))}
            </Grid>
          </Fade>
          {filteredMemories.length === 0 && (
            <Typography variant="body1" align="center" color="text.secondary" sx={{ mt: 4 }}>
              No memories found with the selected tags.
            </Typography>
          )}
        </>
      )}
    </Box>
  );
};

export default MemoryGrid;
