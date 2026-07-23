import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

/** A single headline number with a label and optional caption. */
export function StatCard({
  label,
  value,
  caption,
  color,
}: {
  label: string;
  value: ReactNode;
  caption?: string;
  color?: 'primary' | 'success' | 'warning' | 'text.primary';
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" sx={{ color: color ?? 'text.primary', fontWeight: 600, my: 0.5 }}>
          {value}
        </Typography>
        {caption ? (
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
