import React from 'react';
import { Paper, Typography, Box, Link } from '@mui/material';
import { motion } from 'framer-motion';

const PatreonBar: React.FC = () => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <Link 
        href="https://patreon.com/Foxplaid19773" 
        target="_blank" 
        rel="noopener noreferrer"
        underline="none"
      >
        <Paper
          sx={{
            p: 2,
            mt: 3,
            bgcolor: '#FF424D', // Patreon's brand color
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: '#E23833', // Darker shade of Patreon's color
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <i className="fa-brands fa-patreon" style={{ fontSize: '24px' }} />
            <Typography variant="h6">
              Support us on Patreon!
            </Typography>
          </Box>
        </Paper>
      </Link>
    </motion.div>
  );
};

export default PatreonBar;
