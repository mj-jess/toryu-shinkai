import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { EnrollmentsTable } from '@/components/enrollments-table';
import { listEnrollments } from '@/db';
import { messages } from '@/messages';
import { requireUser } from '@/session';

export default async function EnrollmentsPage() {
  await requireUser();
  const rows = await listEnrollments();

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom>
        {messages.enrollments.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {messages.enrollments.subtitle(rows.length)}
      </Typography>
      <EnrollmentsTable rows={rows} />
    </Box>
  );
}
