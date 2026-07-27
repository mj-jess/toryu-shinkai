'use client';

import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Enrollment } from '@bot/enrollment/types';
import { ButtonLink } from '@/components/button-link';
import { EnrollmentsTable } from '@/components/enrollments-table';
import { RenewalsView } from '@/components/renewals-view';
import { messages } from '@/messages';

/** Tabs live in the URL so links and post-save redirects land on the right one. */
const TAB_KEYS = ['matriculas', 'renovacoes'] as const;

export function AcademiaView({ enrollments, today }: { enrollments: Enrollment[]; today: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('tab') ?? 'matriculas';
  const tab = Math.max(0, TAB_KEYS.indexOf(current as (typeof TAB_KEYS)[number]));

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_event, value: number) =>
          router.replace(value === 0 ? '/academia' : `/academia?tab=${TAB_KEYS[value]}`, {
            scroll: false,
          })
        }
        sx={{ mb: 2 }}
      >
        <Tab label={messages.academia.tabs.list} />
        <Tab label={messages.academia.tabs.renewals} />
      </Tabs>

      {tab === 0 ? (
        <Box>
          <Stack
            direction="row"
            spacing={2}
            sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="body2" color="text.secondary">
              {messages.enrollments.subtitle(enrollments.length)}
            </Typography>
            <ButtonLink href="/academia/nova" variant="contained" startIcon={<AddIcon />}>
              {messages.enrollments.add}
            </ButtonLink>
          </Stack>
          <EnrollmentsTable rows={enrollments} />
        </Box>
      ) : null}

      {tab === 1 ? <RenewalsView enrollments={enrollments} today={today} /> : null}
    </Box>
  );
}
