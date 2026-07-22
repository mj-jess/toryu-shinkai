'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Family identity, drawn from the dragon logo: vivid azure blues with gold
 * accents. Dark mode uses navy-tinted surfaces instead of plain black, and the
 * navbar stays blue in both schemes. The class-based selector lets
 * InitColorSchemeScript apply the stored mode before hydration.
 */
const headingFontFamily = 'var(--font-zen-kaku), var(--font-inter), sans-serif';

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  typography: {
    fontFamily: 'var(--font-inter), "Helvetica Neue", Arial, sans-serif',
    h1: { fontFamily: headingFontFamily },
    h2: { fontFamily: headingFontFamily },
    h3: { fontFamily: headingFontFamily },
    h4: { fontFamily: headingFontFamily },
    h5: { fontFamily: headingFontFamily },
    h6: { fontFamily: headingFontFamily },
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#0277bd' },
        secondary: { main: '#c9a227' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#4fc3f7' },
        secondary: { main: '#e6c35c' },
        background: { default: '#111b29', paper: '#18263a' },
      },
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          // Dark AppBar defaults to grey paper; keep it deep navy instead.
          ...theme.applyStyles('dark', {
            backgroundColor: '#0d2b4a',
            backgroundImage: 'none',
          }),
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          // Sidebar blends with the page background, matching the light scheme.
          ...theme.applyStyles('dark', {
            backgroundColor: (theme.vars ?? theme).palette.background.default,
          }),
        }),
      },
    },
  },
});
