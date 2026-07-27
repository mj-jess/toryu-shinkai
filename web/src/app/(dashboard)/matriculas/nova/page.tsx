import Box from '@mui/material/Box';
import { EnrollmentForm } from '@/components/enrollment-form';
import { EntityCard } from '@/components/entity-card';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';
import { todayIsoBR } from '@/format';
import { messages } from '@/messages';
import { requireUser } from '@/session';

export default async function NewEnrollmentPage() {
  await requireUser();
  const text = messages.enrollmentForm;

  return (
    <Box>
      <PageBreadcrumbs
        items={[
          { label: messages.nav.matriculas, href: '/matriculas' },
          { label: text.newBreadcrumb },
        ]}
      />
      <EntityCard title={text.newTitle} subheader={text.newHint}>
        <EnrollmentForm today={todayIsoBR()} />
      </EntityCard>
    </Box>
  );
}
