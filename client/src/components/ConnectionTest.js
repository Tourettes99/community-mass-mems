import React, { useState, useEffect } from 'react';
import { testConnection } from '../api';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

const ConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setLoading(true);
        const result = await testConnection();
        setConnectionStatus(result);
        setError(null);
      } catch (err) {
        setError(err.message);
        setConnectionStatus(null);
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Error checking connection: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h6" gutterBottom>
        MongoDB Connection Status
      </Typography>
      
      {connectionStatus && (
        <>
          <Alert 
            severity={connectionStatus.connection.state === 'Connected' ? 'success' : 'warning'}
            sx={{ mb: 2 }}
          >
            Status: {connectionStatus.connection.state}
          </Alert>

          <Typography variant="subtitle1" gutterBottom>
            Connection Details:
          </Typography>
          <Box component="pre" sx={{ 
            bgcolor: 'grey.100', 
            p: 2, 
            borderRadius: 1,
            overflow: 'auto'
          }}>
            {JSON.stringify(connectionStatus, null, 2)}
          </Box>
        </>
      )}
    </Box>
  );
};

export default ConnectionTest;
