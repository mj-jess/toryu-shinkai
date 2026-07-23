import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

/** A titled surface for a single chart. */
export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}
