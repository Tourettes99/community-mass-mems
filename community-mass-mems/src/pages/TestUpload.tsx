import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Stack
} from '@mui/material';
import { CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';

interface TestResult {
  category: string;
  url: string;
  response?: any;
  error?: string;
}

interface TestResults {
  successful: TestResult[];
  failed: TestResult[];
}

const TestUpload: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/.netlify/functions/test-uploads');
      const data = await response.json();

      if (response.ok) {
        setResults(data);
      } else {
        setError(data.error || 'Failed to run tests');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        URL Upload Tests
      </Typography>

      <Button
        variant="contained"
        color="primary"
        onClick={runTests}
        disabled={loading}
        sx={{ mb: 3 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Run Tests'}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {results && (
        <Stack spacing={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Stack direction="row" spacing={2}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`${results.successful.length} Successful`}
                color="success"
              />
              <Chip
                icon={<ErrorIcon />}
                label={`${results.failed.length} Failed`}
                color="error"
              />
            </Stack>
          </Paper>

          {results.successful.length > 0 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom color="success.main">
                Successful Uploads
              </Typography>
              <List>
                {results.successful.map((result, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={result.category}
                        secondary={
                          <Box>
                            <Typography variant="body2" component="div">
                              URL: {result.url}
                            </Typography>
                            <Typography variant="body2" component="pre" sx={{ mt: 1 }}>
                              {JSON.stringify(result.response?.metadata, null, 2)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < results.successful.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}

          {results.failed.length > 0 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom color="error.main">
                Failed Uploads
              </Typography>
              <List>
                {results.failed.map((result, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={result.category}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              URL: {result.url}
                            </Typography>
                            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                              Error: {result.error}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < results.failed.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default TestUpload; 