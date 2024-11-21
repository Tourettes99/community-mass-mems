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
  useMediaQuery
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import MemoryCard from './components/MemoryCard';
import SocialScripts from './components/SocialScripts';

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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/.netlify/functions/get-memories');
      if (!response.ok) {
        throw new Error('Failed to fetch memories');
      }
      const data = await response.json();
      setMemories(data.memories);
    } catch (err) {
      console.error('Error fetching memories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="50vh"
        >
          <CircularProgress size={48} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading memories...
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={fetchMemories}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      );
    }

    if (memories.length === 0) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="50vh"
        >
          <Typography variant="h6" color="text.secondary" align="center">
            No memories found. Start by sharing your first memory!
          </Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {memories.map((memory) => (
          <Grid item key={memory._id} xs={12} sm={6} md={4} lg={3}>
            <MemoryCard memory={memory} />
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SocialScripts />
      
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper' }}>
          <Toolbar>
            <Typography
              variant="h1"
              component="h1"
              sx={{
                flexGrow: 1,
                color: 'text.primary',
                fontSize: isMobile ? '1.75rem' : '2.5rem',
                py: 2,
              }}
            >
              Community Mass Mems
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 4 }}>
          {renderContent()}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
