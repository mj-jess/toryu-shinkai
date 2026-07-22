import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/button-link';
import { daysSince, formatDateBR } from '@bot/enrollment/format';
import { gymLabels } from '@bot/messages';
import { findEnrollment } from '@/db';
import { formatTimestampBR } from '@/format';
import { messages } from '@/messages';
import { requireUser } from '@/session';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {label}
      </Typography>
      <Typography variant="body1">{value}</Typography>
    </Grid>
  );
}

export default async function EnrollmentDetailPage({
  params,
}: {
  params: Promise<{ passport: string }>;
}) {
  await requireUser();
  const { passport } = await params;
  const enrollment = await findEnrollment(decodeURIComponent(passport));
  if (!enrollment) notFound();

  const labels = messages.detail.labels;
  const status = enrollment.active
    ? messages.enrollments.statusActive
    : messages.enrollments.statusInactive;
  const enrolledAt = `${formatDateBR(enrollment.enrolledAt)} ${messages.detail.daysAgo(
    daysSince(enrollment.enrolledAt),
  )}`;

  return (
    <Box sx={{ maxWidth: 720 }}>
      <ButtonLink href="/matriculas" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        {messages.detail.back}
      </ButtonLink>
      <Paper sx={{ p: 3 }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
        >
          <Typography variant="h5" component="h1">
            {enrollment.passport} — {enrollment.name}
          </Typography>
          <Chip
            label={status}
            color={enrollment.active ? 'success' : 'default'}
            variant={enrollment.active ? 'filled' : 'outlined'}
          />
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Field label={labels.passport} value={enrollment.passport} />
          <Field label={labels.name} value={enrollment.name} />
          <Field label={labels.phone} value={enrollment.phone} />
          <Field label={labels.gym} value={gymLabels[enrollment.gym]} />
          <Field label={labels.enrolledAt} value={enrolledAt} />
          <Field label={labels.registeredBy} value={enrollment.registeredBy ?? '—'} />
          {enrollment.deactivatedBy ? (
            <Field label={labels.deactivatedBy} value={enrollment.deactivatedBy} />
          ) : null}
          {enrollment.deactivatedAt ? (
            <Field
              label={labels.deactivatedAt}
              value={formatTimestampBR(enrollment.deactivatedAt)}
            />
          ) : null}
        </Grid>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>
          <Field label={labels.createdAt} value={formatTimestampBR(enrollment.createdAt)} />
          <Field label={labels.updatedAt} value={formatTimestampBR(enrollment.updatedAt)} />
        </Grid>
      </Paper>
    </Box>
  );
}
