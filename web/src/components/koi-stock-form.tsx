'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import type { KoiIngredient } from '@bot/koi/types';
import { saveStock } from '@/app/(dashboard)/koi/actions';
import { ingredientEmoji } from '@/koi-icons';
import { messages } from '@/messages';

const text = messages.koi.stock;

function parseQuantity(value: string): number | null {
  if (value.trim() === '') return 0;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function KoiStockForm({ ingredients }: { ingredients: KoiIngredient[] }) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      ingredients.map((ingredient) => [
        ingredient.id,
        ingredient.stockQuantity > 0 ? String(ingredient.stockQuantity) : '',
      ]),
    ),
  );
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, startTransition] = useTransition();

  const parsed = ingredients.map((ingredient) => ({
    id: ingredient.id,
    quantity: parseQuantity(quantities[ingredient.id] ?? ''),
  }));
  const valid = parsed.every((entry) => entry.quantity !== null);

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (!valid || saving) return;
    setFailed(false);
    setSaved(false);
    startTransition(async () => {
      const result = await saveStock(
        parsed.map((entry) => ({ id: entry.id, stockQuantity: entry.quantity ?? 0 })),
      );
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setFailed(true);
      }
    });
  };

  return (
    <Card>
      <CardContent>
        <Stack component="form" spacing={2} onSubmit={handleSave}>
          <div>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {text.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {text.hint}
            </Typography>
          </div>

          {failed ? <Alert severity="error">{text.invalid}</Alert> : null}
          {saved ? <Alert severity="success">{text.saved}</Alert> : null}

          <Grid container spacing={2} columns={{ xs: 12, md: 15 }}>
            {ingredients.map((ingredient) => {
              const value = quantities[ingredient.id] ?? '';
              return (
                <Grid key={ingredient.id} size={{ xs: 6, sm: 4, md: 3 }}>
                  <TextField
                    fullWidth
                    label={`${ingredientEmoji(ingredient.name)} ${ingredient.name}`}
                    value={value}
                    placeholder="0"
                    error={parseQuantity(value) === null}
                    onChange={(event) => {
                      setSaved(false);
                      setQuantities((current) => ({
                        ...current,
                        [ingredient.id]: event.target.value,
                      }));
                    }}
                    slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                  />
                </Grid>
              );
            })}
          </Grid>

          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button type="submit" variant="contained" disabled={!valid || saving}>
              {text.save}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
