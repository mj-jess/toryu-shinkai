'use client';

import AutorenewIcon from '@mui/icons-material/Autorenew';
import BlockIcon from '@mui/icons-material/Block';
import EditIcon from '@mui/icons-material/Edit';
import ReplayIcon from '@mui/icons-material/Replay';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { Enrollment } from '@bot/enrollment/types';
import {
  deactivateEnrollment,
  reactivateEnrollment,
  renewEnrollment,
  type EnrollmentResult,
} from '@/app/(dashboard)/matriculas/actions';
import { messages } from '@/messages';

const text = messages.enrollmentActions;

export function EnrollmentActions({ enrollment }: { enrollment: Enrollment }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const run = (action: () => Promise<EnrollmentResult>, successMessage: string) => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setSnack({ message: successMessage, severity: 'success' });
        router.refresh();
      } else {
        setSnack({ message: text.failed, severity: 'error' });
      }
    });
  };

  const handleDeactivate = () => {
    setConfirmOpen(false);
    run(() => deactivateEnrollment(enrollment.passport), text.deactivated);
  };

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
        <Button
          component={Link}
          href={`/matriculas/${encodeURIComponent(enrollment.passport)}/editar`}
          variant="outlined"
          startIcon={<EditIcon />}
          disabled={pending}
        >
          {text.edit}
        </Button>
        {enrollment.active ? (
          <>
            <Button
              color="success"
              variant="contained"
              startIcon={<AutorenewIcon />}
              disabled={pending}
              onClick={() => run(() => renewEnrollment(enrollment.passport), text.renewed)}
            >
              {text.renew}
            </Button>
            <Button
              color="error"
              variant="outlined"
              startIcon={<BlockIcon />}
              disabled={pending}
              onClick={() => setConfirmOpen(true)}
            >
              {text.deactivate}
            </Button>
          </>
        ) : (
          <Button
            color="success"
            variant="contained"
            startIcon={<ReplayIcon />}
            disabled={pending}
            onClick={() => run(() => reactivateEnrollment(enrollment.passport), text.reactivated)}
          >
            {text.reactivate}
          </Button>
        )}
      </Stack>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{text.confirmTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{text.confirmBody(enrollment.name)}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{text.cancel}</Button>
          <Button color="error" variant="contained" onClick={handleDeactivate}>
            {text.confirm}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack !== null}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? (
          <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(null)}>
            {snack.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
