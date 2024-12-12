import { createTheme, Theme } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

// RAL 2005 Luminous Orange
export const RAL_2005 = '#FF4D06';

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
            light: '#ff7438',
            dark: '#c23900',
            contrastText: '#ffffff',
          },
          background: {
            default: '#fafafa',
            paper: '#ffffff',
          },
          secondary: {
            main: '#424242',
            light: '#6d6d6d',
            dark: '#1b1b1b',
            contrastText: '#ffffff',
          },
          accent: {
            main: RAL_2005,
            light: '#ff7438',
            dark: '#c23900',
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
            light: '#ff7438',
            dark: '#c23900',
            contrastText: '#ffffff',
          },
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          secondary: {
            main: '#424242',
            light: '#6d6d6d',
            dark: '#1b1b1b',
            contrastText: '#ffffff',
          },
          accent: {
            main: RAL_2005,
            light: '#ff7438',
            dark: '#c23900',
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
          '&.MuiChip-clickable:hover': {
            backgroundColor: `${RAL_2005}20`,
          },
          '&.MuiChip-clickable.active': {
            backgroundColor: RAL_2005,
            color: '#ffffff',
          },
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : `${RAL_2005}20`,
          },
        }),
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
            color: '#ff7438',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.MuiButton-contained': {
            backgroundColor: RAL_2005,
            color: '#fff',
            '&:hover': {
              backgroundColor: '#c23900',
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
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
