'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
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

  const handleSave = () => {
    if (!valid) return;
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
        <Stack spacing={2}>
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

          <TableContainer>
            <Table size="small" sx={{ maxWidth: 420 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{text.ingredient}</TableCell>
                  <TableCell align="right">{text.quantity}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ingredients.map((ingredient) => {
                  const value = quantities[ingredient.id] ?? '';
                  return (
                    <TableRow key={ingredient.id} hover>
                      <TableCell>
                        {ingredientEmoji(ingredient.name)} {ingredient.name}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          variant="standard"
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
                          sx={{ width: 72 }}
                          slotProps={{
                            htmlInput: { inputMode: 'numeric', style: { textAlign: 'right' } },
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button variant="contained" disabled={!valid || saving} onClick={handleSave}>
              {text.save}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
