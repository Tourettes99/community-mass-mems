import React from 'react';
import { Paper, Typography, } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const InfoBar: React.FC = () => {
  return (
    <Paper 
      elevation={2}
      sx={{
        p: 2,
        mb: 3,
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}
    >
      <InfoIcon color="primary" sx={{ fontSize: 32 }} />
      <Typography variant="body1" color="text.primary">
        Important info: This website is only built for R1 community memories. Make sure you don't upload personal information or do uploads you regret later. Anything you upload will be permanently uploaded but you can choose to cancel an upload before submitting.
      </Typography>
    </Paper>
  );
};

export default InfoBar;
