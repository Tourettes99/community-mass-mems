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
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'primary.dark',
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              component="img"
              src="https://c5.patreon.com/external/logo/downloads_wordmark_white_on_coral.png"
              alt="Patreon"
              sx={{ height: 30 }}
            />
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
