import { createTheme, Theme } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

// RAL 2005 Luminous Orange
export const RAL_2005 = '#FF4D2A';

// Extend the Theme type to include our custom colors
declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary'];
  }
  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
  }
}

export const getTheme = (mode: PaletteMode): Theme => createTheme({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light mode colors
          primary: {
            main: RAL_2005,
            light: '#FF6B4D',
            dark: '#E63A1A',
          },
          background: {
            default: '#f5f5f5',
            paper: '#ffffff',
          },
          secondary: {
            main: '#808080',
          },
          accent: {
            main: RAL_2005,
            light: '#FF6B4D',
            dark: '#E63A1A',
          },
          text: {
            primary: '#666666',
            secondary: '#808080',
          },
        }
      : {
          // Dark mode colors
          primary: {
            main: RAL_2005,
            light: '#FF6B4D',
            dark: '#E63A1A',
          },
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          secondary: {
            main: '#808080',
          },
          accent: {
            main: RAL_2005,
            light: '#FF6B4D',
            dark: '#E63A1A',
          },
          text: {
            primary: '#FFFFFF',
            secondary: '#B3B3B3',
          },
        }),
  },
  components: {
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.MuiChip-filled': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 77, 42, 0.2)' 
              : 'rgba(255, 77, 42, 0.1)',
            color: RAL_2005,
            '& .MuiChip-icon': {
              color: RAL_2005,
            },
          },
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: `${RAL_2005}20`,
          },
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: RAL_2005,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: RAL_2005,
          '&:hover': {
            color: '#FF6B4D',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          '&.MuiButton-contained': {
            backgroundColor: RAL_2005,
            color: '#fff',
            '&:hover': {
              backgroundColor: '#E63A1A',
            },
          },
          '&.MuiButton-outlined': {
            borderColor: RAL_2005,
            color: RAL_2005,
            '&:hover': {
              backgroundColor: `${RAL_2005}20`,
            },
          },
        },
      },
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
    },
    h2: {
      fontWeight: 500,
    },
    h3: {
      fontWeight: 500,
    },
    h4: {
      fontWeight: 500,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
});
