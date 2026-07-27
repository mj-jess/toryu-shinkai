import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { AcademiaView } from '@/components/academia-view';
import { listEnrollments } from '@/db';
import { todayIsoBR } from '@/format';
import { messages } from '@/messages';
import { requireUser } from '@/session';

export default async function AcademiaPage() {
  await requireUser();
  const enrollments = await listEnrollments();

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom>
        {messages.academia.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {messages.academia.subtitle}
      </Typography>
      <AcademiaView enrollments={enrollments} today={todayIsoBR()} />
    </Box>
  );
}
