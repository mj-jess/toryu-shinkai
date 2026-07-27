import Box from '@mui/material/Box';
import { notFound } from 'next/navigation';
import { EnrollmentForm } from '@/components/enrollment-form';
import { EntityCard } from '@/components/entity-card';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';
import { findEnrollment } from '@/db';
import { messages } from '@/messages';
import { requireUser } from '@/session';

export default async function EditEnrollmentPage({
  params,
}: {
  params: Promise<{ passport: string }>;
}) {
  await requireUser();
  const { passport } = await params;
  const enrollment = await findEnrollment(decodeURIComponent(passport));
  if (!enrollment) notFound();

  const text = messages.enrollmentForm;
  const header = `${enrollment.passport} | ${enrollment.name}`;

  return (
    <Box>
      <PageBreadcrumbs
        items={[
          { label: messages.nav.matriculas, href: '/matriculas' },
          { label: header, href: `/matriculas/${encodeURIComponent(enrollment.passport)}` },
          { label: text.editBreadcrumb },
        ]}
      />
      <EntityCard title={text.editTitle} subheader={header}>
        <EnrollmentForm enrollment={enrollment} />
      </EntityCard>
    </Box>
  );
}
