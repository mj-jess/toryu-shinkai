'use client';

import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { KoiSale } from '@bot/koi/types';
import { setWeeklyPostEnabled } from '@/app/(dashboard)/koi/actions';
import { KoiSalesTable } from '@/components/koi-sales-table';
import { messages } from '@/messages';

const text = messages.koi.sales;

function WeeklyPostSwitch({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [failed, setFailed] = useState(false);
  const [saving, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    setChecked(next);
    setFailed(false);
    startTransition(async () => {
      const result = await setWeeklyPostEnabled(next).catch(() => ({ ok: false }));
      if (!result.ok) {
        setChecked(!next);
        setFailed(true);
      }
    });
  };

  return (
    <Card>
      <CardContent>
        <FormControlLabel
          control={
            <Switch
              checked={checked}
              disabled={saving}
              onChange={(event) => toggle(event.target.checked)}
            />
          }
          label={`${text.weeklyPost.label}: ${checked ? text.weeklyPost.on : text.weeklyPost.off}`}
        />
        <Typography variant="body2" color="text.secondary">
          {text.weeklyPost.hint}
        </Typography>
        {failed ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {text.weeklyPost.failed}
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Index of the registered shifts: the table plus the add button. */
export function KoiSalesView({
  sales,
  weeklyPostEnabled,
}: {
  sales: KoiSale[];
  weeklyPostEnabled: boolean;
}) {
  return (
    <Stack spacing={2}>
      <WeeklyPostSwitch enabled={weeklyPostEnabled} />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {text.indexTitle}
        </Typography>
        <Button
          component={Link}
          href="/koi/vendas/nova"
          variant="contained"
          startIcon={<AddIcon />}
        >
          {text.add}
        </Button>
      </Stack>

      <KoiSalesTable sales={sales} />
    </Stack>
  );
}
