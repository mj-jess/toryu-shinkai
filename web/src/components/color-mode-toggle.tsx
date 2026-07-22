'use client';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useColorScheme } from '@mui/material/styles';
import { messages } from '@/messages';

export function ColorModeToggle() {
  const { mode, setMode } = useColorScheme();

  // Mode is unknown during SSR; render a stable placeholder to avoid hydration mismatch.
  if (!mode) {
    return (
      <IconButton color="inherit" disabled>
        <DarkModeIcon />
      </IconButton>
    );
  }

  const dark = mode === 'dark';
  const label = dark ? messages.theme.light : messages.theme.dark;
  return (
    <Tooltip title={label}>
      <IconButton
        color="inherit"
        aria-label={label}
        onClick={() => setMode(dark ? 'light' : 'dark')}
      >
        {dark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
