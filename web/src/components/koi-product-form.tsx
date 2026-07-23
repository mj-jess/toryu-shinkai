'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { KoiProduct } from '@bot/koi/types';
import { saveProduct } from '@/app/(dashboard)/koi/actions';
import { messages } from '@/messages';

const text = messages.koi.edit;

function parsePrice(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && value.trim() !== '' ? parsed : null;
}

export function KoiProductForm({ product }: { product: KoiProduct }) {
  const router = useRouter();
  const [name, setName] = useState(product.name);
  const [totem, setTotem] = useState(String(product.totemPrice));
  const [street, setStreet] = useState(String(product.streetPrice));
  const [failed, setFailed] = useState(false);
  const [saving, startTransition] = useTransition();

  const totemPrice = parsePrice(totem);
  const streetPrice = parsePrice(street);
  const valid = name.trim() !== '' && totemPrice !== null && streetPrice !== null;

  const handleSave = () => {
    if (totemPrice === null || streetPrice === null) return;
    setFailed(false);
    startTransition(async () => {
      const result = await saveProduct(product.id, { name, totemPrice, streetPrice });
      if (result.ok) {
        router.push('/koi');
        router.refresh();
      } else {
        setFailed(true);
      }
    });
  };

  return (
    <Stack spacing={3}>
      {failed ? <Alert severity="error">{text.invalid}</Alert> : null}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label={text.name}
            value={name}
            error={name.trim() === ''}
            onChange={(event) => setName(event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            fullWidth
            label={text.totemPrice}
            value={totem}
            error={totemPrice === null}
            onChange={(event) => setTotem(event.target.value)}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            fullWidth
            label={text.streetPrice}
            value={street}
            error={streetPrice === null}
            onChange={(event) => setStreet(event.target.value)}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
        </Grid>
      </Grid>
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button variant="contained" disabled={!valid || saving} onClick={handleSave}>
          {text.save}
        </Button>
      </Stack>
    </Stack>
  );
}
