import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ButtonLink } from '@/components/button-link';
import { EnrollmentsTable } from '@/components/enrollments-table';
import { listEnrollments } from '@/db';
import { messages } from '@/messages';
import { requireUser } from '@/session';

export default async function EnrollmentsPage() {
  await requireUser();
  const rows = await listEnrollments();

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}
      >
        <Box>
          <Typography variant="h5" component="h1" gutterBottom>
            {messages.enrollments.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {messages.enrollments.subtitle(rows.length)}
          </Typography>
        </Box>
        <ButtonLink href="/matriculas/nova" variant="contained" startIcon={<AddIcon />}>
          {messages.enrollments.add}
        </ButtonLink>
      </Stack>
      <EnrollmentsTable rows={rows} />
    </Box>
  );
}
