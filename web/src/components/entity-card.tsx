import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

/**
 * Standard container for show/edit pages: one card wrapping the whole content,
 * with a big page-style title (h5, matching index pages), optional subheader
 * and header action (e.g. a status chip), a divider, then the content.
 */
export function EntityCard({
  title,
  subheader,
  action,
  children,
}: {
  title: string;
  subheader?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}
      >
        <Box>
          <Typography variant="h5" component="h1">
            {title}
          </Typography>
          {subheader ? (
            <Typography variant="body2" color="text.secondary">
              {subheader}
            </Typography>
          ) : null}
        </Box>
        {action}
      </Stack>
      <Divider />
      <Box sx={{ p: 3 }}>{children}</Box>
    </Card>
  );
}
