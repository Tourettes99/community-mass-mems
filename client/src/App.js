import React from 'react';
import { Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import UploadForm from './components/UploadForm';
import MemoryGrid from './components/MemoryGrid';
import WelcomeDialog from './components/WelcomeDialog';
import useMemories from './hooks/useMemories';

const theme = createTheme({
  palette: {
    primary: {
      main: '#FF4D06',
    },
    background: {
      default: '#ffffff',
    },
    text: {
      primary: '#000000',
    },
  },
});

function App() {
  const { memories, loading, error } = useMemories();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, py: 4 }}>
        <WelcomeDialog />
        <UploadForm />
        {error && (
          <div style={{ color: 'red', textAlign: 'center', margin: '1rem 0' }}>
            {error}
          </div>
        )}
        {loading ? (
          <div style={{ textAlign: 'center', margin: '2rem 0' }}>
            Loading memories...
          </div>
        ) : (
          <MemoryGrid memories={memories} />
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
