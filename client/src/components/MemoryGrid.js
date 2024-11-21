import React, { useState, useEffect } from 'react';
import { Box, Fade, Grid } from '@mui/material';
import { styled } from '@mui/material/styles';
import Memory from './Memory';

const StyledMemoryWrapper = styled(Box)(({ theme, delay }) => ({
  width: '100%',
  height: '100%',
  animation: `$pulse 3s infinite ${delay}ms ease-in-out`,
  '@keyframes pulse': {
    '0%': {
      transform: 'scale(1)',
    },
    '50%': {
      transform: 'scale(1.02)',
    },
    '100%': {
      transform: 'scale(1)',
    },
  },
}));

// Fisher-Yates shuffle algorithm with weighted randomization
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Add some weighted randomness based on memory type
    const weight = Math.random() + getMemoryTypeWeight(shuffled[i].type);
    const j = Math.floor(weight * (i + 1)) % shuffled.length;
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Weight different memory types to influence their positioning
const getMemoryTypeWeight = (type) => {
  switch (type) {
    case 'image':
    case 'gif':
      return 0.3; // Higher chance to be at the top
    case 'text':
      return 0.2;
    case 'audio':
      return 0.1;
    default:
      return 0;
  }
};

// Get random span for variety
const getRandomSpan = (type) => {
  switch (type) {
    case 'image':
    case 'gif':
      return Math.random() > 0.7 ? 2 : 1; // 30% chance for double width
    case 'text':
      return Math.random() > 0.8 ? 2 : 1; // 20% chance for double width
    default:
      return 1;
  }
};

const MemoryGrid = ({ memories }) => {
  const [displayedMemories, setDisplayedMemories] = useState([]);
  const [spans, setSpans] = useState({});

  // Initialize spans and shuffle memories
  useEffect(() => {
    const newSpans = {};
    memories.forEach(memory => {
      newSpans[memory._id] = getRandomSpan(memory.type);
    });
    setSpans(newSpans);
    setDisplayedMemories(shuffleArray(memories));
  }, [memories]);

  // Periodically reshuffle memories and update spans
  useEffect(() => {
    const shuffleInterval = setInterval(() => {
      setDisplayedMemories(prevMemories => {
        const newMemories = shuffleArray(prevMemories);
        const newSpans = {};
        newMemories.forEach(memory => {
          newSpans[memory._id] = getRandomSpan(memory.type);
        });
        setSpans(newSpans);
        return newMemories;
      });
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearInterval(shuffleInterval);
  }, []);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', p: 3 }}>
      <Grid container spacing={3}>
        {displayedMemories.map((memory, index) => (
          <Grid
            item
            key={memory._id}
            xs={12}
            sm={spans[memory._id] === 2 ? 12 : 6}
            md={spans[memory._id] === 2 ? 8 : 4}
            lg={spans[memory._id] === 2 ? 6 : 3}
          >
            <Fade in timeout={300} style={{ transitionDelay: `${index * 100}ms` }}>
              <StyledMemoryWrapper delay={index * 500 % 2000}>
                <Memory memory={memory} />
              </StyledMemoryWrapper>
            </Fade>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default MemoryGrid;
