'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { KoiProduct } from '@bot/koi/types';
import { registerSale } from '@/app/(dashboard)/koi/actions';
import { SALES_TAB } from '@/components/koi-view';
import { formatMoney } from '@/format';
import { productEmoji } from '@/koi-icons';
import { messages } from '@/messages';

const text = messages.koi.sales;

function parseQuantity(value: string): number | null {
  if (value.trim() === '') return 0;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function KoiSaleForm({ products, today }: { products: KoiProduct[]; today: string }) {
  const router = useRouter();
  const [soldAt, setSoldAt] = useState(today);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  const parsed = products.map((product) => ({
    product,
    quantity: parseQuantity(inputs[product.id] ?? ''),
  }));
  const anyInvalid = parsed.some((entry) => entry.quantity === null);
  const total = parsed.reduce((sum, entry) => sum + (entry.quantity ?? 0), 0);
  const valid = !anyInvalid && total > 0 && soldAt !== '';

  const handleRegister = () => {
    setError(null);
    startTransition(async () => {
      const result = await registerSale(
        soldAt,
        parsed
          .filter((entry) => (entry.quantity ?? 0) > 0)
          .map((entry) => ({ productId: entry.product.id, quantity: entry.quantity ?? 0 })),
      );
      if (result.ok) {
        router.push(SALES_TAB);
        router.refresh();
      } else {
        setError(result.needsLogin ? text.needsLogin : text.invalid);
      }
    });
  };

  return (
    <Stack spacing={3}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <TextField
            fullWidth
            type="date"
            label={text.date}
            value={soldAt}
            onChange={(event) => setSoldAt(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
        {parsed.map(({ product, quantity }) => (
          <Grid key={product.id} size={{ xs: 6, sm: 4, md: 3 }}>
            <TextField
              fullWidth
              label={`${productEmoji(product.name)} ${product.name}`}
              value={inputs[product.id] ?? ''}
              error={quantity === null}
              placeholder="0"
              helperText={formatMoney(product.streetPrice)}
              onChange={(event) =>
                setInputs((current) => ({ ...current, [product.id]: event.target.value }))
              }
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />
          </Grid>
        ))}
      </Grid>

      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button variant="contained" disabled={!valid || saving} onClick={handleRegister}>
          {text.register}
        </Button>
      </Stack>
    </Stack>
  );
}
