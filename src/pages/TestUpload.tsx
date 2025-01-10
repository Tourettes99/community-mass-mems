import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, List, ListItem } from '@mui/material';

const API_URL = process.env.REACT_APP_API_URL || '/.netlify/functions';

const TEST_URLS = [
  // Video Platforms
  {
    category: 'Video - YouTube',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    category: 'Video - Vimeo',
    url: 'https://vimeo.com/148751763'
  },
  {
    category: 'Video - TikTok',
    url: 'https://www.tiktok.com/@khaby.lame/video/7137723462233555205'
  },
  // Social Media
  {
    category: 'Social - Twitter',
    url: 'https://twitter.com/elonmusk/status/1759087542254297190'
  }
];

interface TestResult {
  category: string;
  url: string;
  success: boolean;
  error?: string;
  metadata?: any;
}

const TestUpload: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  const testUrl = async (url: string, category: string) => {
    try {
      console.log('Testing URL:', url);
      console.log('API URL:', `${API_URL}/uploadUrl`);

      const response = await fetch(`${API_URL}/uploadUrl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'url',
          url: url,
          tags: ['test', category.toLowerCase().split(' ')[0]]
        })
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        throw new Error(responseText || `HTTP error! status: ${response.status}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Failed to parse response as JSON');
      }

      return {
        category,
        url,
        success: true,
        metadata: data
      };
    } catch (error) {
      console.error('Error testing URL:', error);
      return {
        category,
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  };

  const runTests = async () => {
    setLoading(true);
    const newResults: TestResult[] = [];

    for (const test of TEST_URLS) {
      const result = await testUrl(test.url, test.category);
      newResults.push(result);
      setResults([...newResults]); // Update results as they come in
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between tests
    }

    setLoading(false);
  };

  const testCustomUrl = async () => {
    if (!customUrl) return;
    setLoading(true);
    const result = await testUrl(customUrl, 'Custom URL');
    setResults(prev => [...prev, result]);
    setLoading(false);
    setCustomUrl('');
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        URL Upload Testing
      </Typography>

      <Box mb={3}>
        <TextField
          fullWidth
          label="Test Custom URL"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          disabled={loading}
        />
        <Button
          variant="contained"
          onClick={testCustomUrl}
          disabled={loading || !customUrl}
          sx={{ mt: 1 }}
        >
          Test Custom URL
        </Button>
      </Box>

      <Button
        variant="contained"
        onClick={runTests}
        disabled={loading}
        sx={{ mb: 3 }}
      >
        Run All Tests
      </Button>

      <List>
        {results.map((result, index) => (
          <ListItem key={index}>
            <Paper elevation={2} sx={{ p: 2, width: '100%' }}>
              <Typography variant="h6" gutterBottom>
                {result.category}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {result.url}
              </Typography>
              {result.success ? (
                <Typography color="success.main">
                  Success ✓
                </Typography>
              ) : (
                <Typography color="error.main">
                  Error: {result.error}
                </Typography>
              )}
              {result.metadata && (
                <Box mt={1}>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    Metadata: {JSON.stringify(result.metadata, null, 2)}
                  </Typography>
                </Box>
              )}
            </Paper>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default TestUpload; 