import React, { useState, useEffect } from 'react';
import { Grid, Fade } from '@mui/material';
import { styled } from '@mui/material/styles';
import Memory from './Memory';

const StyledGrid = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(3),
  '& .MuiGrid-item': {
    display: 'flex',
  }
}));

// Fisher-Yates shuffle algorithm
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const MemoryGrid = ({ memories }) => {
  const [displayedMemories, setDisplayedMemories] = useState([]);

  // Shuffle memories whenever the memories prop changes
  useEffect(() => {
    setDisplayedMemories(shuffleArray(memories));
  }, [memories]);

  // Periodically reshuffle memories every 5 minutes
  useEffect(() => {
    const shuffleInterval = setInterval(() => {
      setDisplayedMemories(prevMemories => shuffleArray(prevMemories));
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    return () => clearInterval(shuffleInterval);
  }, []);

  return (
    <StyledGrid container spacing={3}>
      {displayedMemories.map((memory, index) => (
        <Grid item xs={12} sm={6} md={4} key={memory._id}>
          <Fade in timeout={300} style={{ transitionDelay: `${index * 100}ms` }}>
            <div style={{ width: '100%', height: '100%' }}>
              <Memory memory={memory} />
            </div>
          </Fade>
        </Grid>
      ))}
    </StyledGrid>
  );
};

export default MemoryGrid;
