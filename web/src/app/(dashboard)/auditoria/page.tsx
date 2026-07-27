import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { AuditTable } from '@/components/audit-table';
import { listAuditEvents } from '@/db';
import { messages } from '@/messages';
import { requireUser } from '@/session';

export default async function AuditPage() {
  await requireUser();
  const events = await listAuditEvents();

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom>
        {messages.audit.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {messages.audit.subtitle}
      </Typography>
      <AuditTable events={events} />
    </Box>
  );
}
