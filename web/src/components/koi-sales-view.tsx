'use client';

import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import type { KoiSale } from '@bot/koi/types';
import { KoiSalesTable } from '@/components/koi-sales-table';
import { messages } from '@/messages';

const text = messages.koi.sales;

/** Index of the registered shifts: the table plus the add button. */
export function KoiSalesView({ sales }: { sales: KoiSale[] }) {
  return (
    <Stack spacing={2}>
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
