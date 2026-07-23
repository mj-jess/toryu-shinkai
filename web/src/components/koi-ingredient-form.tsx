'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { KoiIngredient } from '@bot/koi/types';
import { saveIngredient } from '@/app/(dashboard)/koi/actions';
import { INGREDIENTS_TAB } from '@/components/koi-view';
import { messages } from '@/messages';

const text = messages.koi.edit;

function parsePrice(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && value.trim() !== '' ? parsed : null;
}

export function KoiIngredientForm({ ingredient }: { ingredient: KoiIngredient }) {
  const router = useRouter();
  const [name, setName] = useState(ingredient.name);
  const [buy, setBuy] = useState(String(ingredient.buyPrice));
  const [collectible, setCollectible] = useState(ingredient.collectible);
  const [collectCost, setCollectCost] = useState(String(ingredient.collectCost));
  const [note, setNote] = useState(ingredient.note ?? '');
  const [failed, setFailed] = useState(false);
  const [saving, startTransition] = useTransition();

  const buyPrice = parsePrice(buy);
  const collectCostPrice = parsePrice(collectCost);
  const valid =
    name.trim() !== '' && buyPrice !== null && (!collectible || collectCostPrice !== null);

  const handleSave = () => {
    if (buyPrice === null) return;
    setFailed(false);
    startTransition(async () => {
      const result = await saveIngredient(ingredient.id, {
        name,
        buyPrice,
        collectible,
        collectCost: collectible ? (collectCostPrice ?? 0) : 0,
        note,
      });
      if (result.ok) {
        router.push(INGREDIENTS_TAB);
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
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label={text.buyPrice}
            value={buy}
            error={buyPrice === null}
            onChange={(event) => setBuy(event.target.value)}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={collectible}
                onChange={(event) => setCollectible(event.target.checked)}
              />
            }
            label={text.collectible}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label={text.collectCost}
            value={collectCost}
            error={collectible && collectCostPrice === null}
            disabled={!collectible}
            helperText={text.collectCostHelp}
            onChange={(event) => setCollectCost(event.target.value)}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            label={text.note}
            value={note}
            multiline
            minRows={2}
            onChange={(event) => setNote(event.target.value)}
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
