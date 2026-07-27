'use client';

import AutorenewIcon from '@mui/icons-material/Autorenew';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { ptBR } from '@mui/x-data-grid/locales';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { formatDateBR } from '@bot/enrollment/format';
import type { Enrollment } from '@bot/enrollment/types';
import { gymLabels } from '@bot/messages';
import { renewEnrollment } from '@/app/(dashboard)/academia/actions';
import { daysBetween } from '@/format';
import { messages } from '@/messages';

const text = messages.renewals;

/** How far back each period reaches — mirrors the bot's due view (30/14 days). */
const PERIOD_DAYS = { '1m': 30, '2w': 14 } as const;
type Period = keyof typeof PERIOD_DAYS;

type DueRow = Enrollment & { days: number };

export function RenewalsView({ enrollments, today }: { enrollments: Enrollment[]; today: string }) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('1m');
  const [renewing, setRenewing] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const rows = useMemo<DueRow[]>(() => {
    const minDays = PERIOD_DAYS[period];
    return enrollments
      .filter((enrollment) => enrollment.active)
      .map((enrollment) => ({ ...enrollment, days: daysBetween(enrollment.enrolledAt, today) }))
      .filter((enrollment) => enrollment.days >= minDays)
      .sort((a, b) => b.days - a.days);
  }, [enrollments, today, period]);

  const handleRenew = (passport: string) => {
    setRenewing(passport);
    startTransition(async () => {
      const result = await renewEnrollment(passport);
      if (result.ok) {
        setSnack({ message: text.renewed, severity: 'success' });
        router.refresh();
      } else {
        setSnack({ message: text.failed, severity: 'error' });
      }
      setRenewing(null);
    });
  };

  const columns: GridColDef<DueRow>[] = [
    { field: 'passport', headerName: text.columns.passport, width: 120 },
    { field: 'name', headerName: text.columns.name, flex: 1, minWidth: 180 },
    {
      field: 'phone',
      headerName: text.columns.phone,
      width: 150,
      valueGetter: (_value, row) => row.phone ?? '—',
    },
    {
      field: 'gym',
      headerName: text.columns.gym,
      width: 120,
      valueGetter: (_value, row) => gymLabels[row.gym],
    },
    {
      field: 'enrolledAt',
      headerName: text.columns.enrolledAt,
      width: 140,
      valueFormatter: (value: string) => formatDateBR(value),
    },
    {
      field: 'days',
      headerName: text.columns.overdue,
      width: 130,
      renderCell: (params) => (
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={text.overdueDays(params.row.days)}
        />
      ),
    },
    {
      field: 'actions',
      headerName: text.columns.actions,
      width: 110,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
          <Tooltip title={text.view}>
            <IconButton
              component={Link}
              href={`/academia/${encodeURIComponent(params.row.passport)}`}
              size="small"
              aria-label={text.view}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={text.renew}>
            <IconButton
              color="success"
              size="small"
              aria-label={text.renew}
              disabled={renewing !== null}
              onClick={() => handleRenew(params.row.passport)}
            >
              <AutorenewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}
      >
        <Typography variant="body2" color="text.secondary">
          {rows.length > 0 ? text.note(period === '1m' ? text.period1m : text.period2w) : ''}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={period}
          onChange={(_event, value: Period | null) => {
            if (value) setPeriod(value);
          }}
        >
          <ToggleButton value="2w">{text.period2w}</ToggleButton>
          <ToggleButton value="1m">{text.period1m}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {rows.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          {text.empty}
        </Typography>
      ) : (
        <Paper sx={{ height: 'calc(100vh - 320px)', minHeight: 420 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
            showToolbar
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
            sx={{ border: 0 }}
          />
        </Paper>
      )}

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
