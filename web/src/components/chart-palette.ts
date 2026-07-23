'use client';

import { useColorScheme } from '@mui/material/styles';

/**
 * Categorical slots from the data-viz reference palette (CVD-validated), each
 * stepped for its surface. We only ever use the first three slots — the
 * documented all-pairs-safe subset — for pies/grouped bars.
 */
const LIGHT = ['#2a78d6', '#eb6834', '#1baf7a'] as const;
const DARK = ['#3987e5', '#d95926', '#199e70'] as const;

/** Returns the categorical colors for the currently applied color scheme. */
export function useChartPalette(): readonly string[] {
  const { mode, systemMode } = useColorScheme();
  const resolved = mode === 'system' ? systemMode : mode;
  return resolved === 'dark' ? DARK : LIGHT;
}
