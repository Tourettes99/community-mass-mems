import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#FF5F1F', // Bright Orange RAL 2005
    },
    secondary: {
      main: '#808080', // Gray
    },
    background: {
      default: '#FFFFFF', // White
      paper: '#F5F5F5', // Light Gray
    },
    text: {
      primary: '#666666', // Gray text
      secondary: '#808080',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
  },
});
