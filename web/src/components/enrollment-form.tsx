'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { formatDateBR } from '@bot/enrollment/format';
import { GYMS, type Enrollment } from '@bot/enrollment/types';
import { gymLabels } from '@bot/messages';
import {
  registerEnrollment,
  saveEnrollment,
  type EnrollmentResult,
} from '@/app/(dashboard)/matriculas/actions';
import { messages } from '@/messages';

const text = messages.enrollmentForm;

/** Progressive `(999) 999-999` mask, derived purely from the typed digits. */
function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function errorMessage(result: EnrollmentResult): string {
  const conflict = result.conflict;
  if (result.error === 'phoneInUse' && conflict) {
    return text.phoneInUse(conflict.phone ?? '', conflict.passport, conflict.name);
  }
  if (result.error === 'passportInUse' && conflict) {
    return text.passportInUse(conflict.passport, conflict.name);
  }
  if (result.error === 'alreadyEnrolled' && conflict) {
    return text.alreadyEnrolled(
      conflict.passport,
      conflict.name,
      gymLabels[conflict.gym ?? 'both'],
      conflict.enrolledAt ? formatDateBR(conflict.enrolledAt) : '',
    );
  }
  if (result.error === 'notFound') return text.notFound;
  if (result.error === 'failed') return text.failed;
  return text.invalid;
}

export function EnrollmentForm({ enrollment, today }: { enrollment?: Enrollment; today?: string }) {
  const router = useRouter();
  const isEdit = enrollment !== undefined;

  const [passport, setPassport] = useState(enrollment?.passport ?? '');
  const [name, setName] = useState(enrollment?.name ?? '');
  const [phone, setPhone] = useState(enrollment?.phone ?? '');
  const [gym, setGym] = useState<string>(enrollment?.gym ?? 'both');
  const [enrolledAt, setEnrolledAt] = useState(enrollment?.enrolledAt ?? today ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  const phoneDigits = phone.replace(/\D/g, '');
  const phoneProvided = phone.trim() !== '';
  // Phone is optional; when filled, it must be a valid 9-digit number.
  const phoneValid = !phoneProvided || phoneDigits.length === 9;
  const valid =
    passport.trim() !== '' && name.trim() !== '' && enrolledAt !== '' && gym !== '' && phoneValid;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid || saving) return;
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await saveEnrollment(enrollment.passport, { passport, name, phone, gym, enrolledAt })
        : await registerEnrollment({ passport, name, phone, gym, enrolledAt });
      if (result.ok) {
        router.push(`/matriculas/${encodeURIComponent(result.passport ?? passport)}`);
        router.refresh();
      } else {
        setError(errorMessage(result));
      }
    });
  };

  return (
    <Stack component="form" spacing={3} onSubmit={handleSubmit}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField
            fullWidth
            label={text.passport}
            value={passport}
            error={passport.trim() === ''}
            helperText={isEdit ? text.passportEditHelp : undefined}
            onChange={(event) => setPassport(event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label={text.name}
            value={name}
            error={name.trim() === ''}
            onChange={(event) => setName(event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField
            fullWidth
            label={text.phone}
            value={phone}
            error={phoneProvided && phoneDigits.length !== 9}
            helperText={text.phoneHelp}
            placeholder="(999) 999-999"
            onChange={(event) => setPhone(maskPhone(event.target.value))}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            select
            fullWidth
            label={text.gym}
            value={gym}
            onChange={(event) => setGym(event.target.value)}
          >
            {GYMS.map((option) => (
              <MenuItem key={option} value={option}>
                {gymLabels[option]}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            type="date"
            label={text.enrolledAt}
            value={enrolledAt}
            error={enrolledAt === ''}
            onChange={(event) => setEnrolledAt(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
      </Grid>
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button type="submit" variant="contained" disabled={!valid || saving}>
          {isEdit ? text.save : text.register}
        </Button>
      </Stack>
    </Stack>
  );
}
