'use client';

import EastIcon from '@mui/icons-material/East';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { messages } from '@/messages';

export interface DueEntry {
  passport: string;
  name: string;
  days: number;
}

const text = messages.inicio.academia;

/**
 * The renewal queue. Lives in a client component because pairing MUI's
 * `component` prop with next/link cannot cross the server boundary.
 */
export function DueQueueList({ entries }: { entries: DueEntry[] }) {
  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {text.dueEmpty}
      </Typography>
    );
  }

  return (
    <List disablePadding>
      {entries.map((entry) => (
        <ListItem key={entry.passport} disablePadding>
          <ListItemButton
            component={Link}
            href={`/matriculas/${encodeURIComponent(entry.passport)}`}
          >
            <ListItemText
              primary={`${entry.passport} — ${entry.name}`}
              secondary={text.dueDays(entry.days)}
            />
            <EastIcon fontSize="small" color="action" />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}
