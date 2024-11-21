import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  AppBar,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Grid,
  useMediaQuery,
  Tabs,
  Tab
} from '@mui/material';
import { Refresh as RefreshIcon, Link as LinkIcon, TextFields as TextIcon } from '@mui/icons-material';
import MemoryCard from './components/MemoryCard';
import SocialScripts from './components/SocialScripts';
import TextUploadForm from './components/TextUploadForm';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      '@media (max-width:600px)': {
        fontSize: '2rem',
      },
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

function App() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadType, setUploadType] = useState('link');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/.netlify/functions/getMemories');
      if (!response.ok) throw new Error('Failed to fetch memories');
      const data = await response.json();
      setMemories(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleUpload = async (newMemory) => {
    await fetchMemories();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Community Mass Mems
            </Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={fetchMemories}
              disabled={loading}
            >
              Refresh
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Tabs
              value={uploadType}
              onChange={(e, newValue) => setUploadType(newValue)}
              centered={!isMobile}
              variant={isMobile ? "scrollable" : "standard"}
              scrollButtons={isMobile ? "auto" : false}
            >
              <Tab 
                icon={<LinkIcon />} 
                label="Link" 
                value="link"
                sx={{ minWidth: isMobile ? 'auto' : 120 }}
              />
              <Tab 
                icon={<TextIcon />} 
                label="Text" 
                value="text"
                sx={{ minWidth: isMobile ? 'auto' : 120 }}
              />
            </Tabs>
          </Box>

          {uploadType === 'text' && (
            <TextUploadForm onUpload={handleUpload} />
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {loading ? (
              <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
              </Grid>
            ) : (
              memories.map((memory) => (
                <Grid item xs={12} sm={6} md={4} key={memory._id}>
                  <MemoryCard memory={memory} />
                </Grid>
              ))
            )}
          </Grid>
        </Container>
      </Box>
      <SocialScripts />
    </ThemeProvider>
  );
}

export default App;
