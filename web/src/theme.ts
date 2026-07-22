'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Family identity: deep red, with light and dark schemes. The class-based
 * selector lets InitColorSchemeScript apply the stored mode before hydration.
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: { palette: { primary: { main: '#b71c1c' } } },
    dark: { palette: { primary: { main: '#ef5350' } } },
  },
});
