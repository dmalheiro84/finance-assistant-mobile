import { createTheme, responsiveFontSizes, type ThemeOptions } from '@mui/material/styles';
import { ptPT } from '@mui/material/locale';

// Paleta inspirada em Material Design 3 (tom "verde-financeiro"), com
// variantes clara e escura. As cores seguem a lógica de tokens MD3
// (primary/secondary/surface) sem depender do gerador oficial de temas.
const shared: ThemeOptions = {
  typography: {
    fontFamily: [
      '"Roboto"',
      '"Segoe UI"',
      'system-ui',
      '-apple-system',
      'sans-serif',
    ].join(','),
  },
  shape: {
    borderRadius: 16,
  },
};

export const lightTheme = responsiveFontSizes(
  createTheme(
    {
      ...shared,
      palette: {
        mode: 'light',
        primary: { main: '#1b6b5a' },
        secondary: { main: '#4a635c' },
        error: { main: '#ba1a1a' },
        warning: { main: '#8a5a00' },
        background: { default: '#fffbff', paper: '#f4fbf6' },
      },
    },
    ptPT,
  ),
);

export const darkTheme = responsiveFontSizes(
  createTheme(
    {
      ...shared,
      palette: {
        mode: 'dark',
        primary: { main: '#84d6bd' },
        secondary: { main: '#b1ccc3' },
        error: { main: '#ffb4ab' },
        warning: { main: '#ffb95c' },
        background: { default: '#191c1b', paper: '#1f2320' },
      },
    },
    ptPT,
  ),
);
