'use client';

import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { restockCost, stockShortage, type StockShortage } from '@bot/koi/stock';
import type { KoiIngredient } from '@bot/koi/types';
import { saveStock } from '@/app/(dashboard)/koi/actions';
import { KoiInventoryDialog } from '@/components/koi-inventory-dialog';
import { formatMoney } from '@/format';
import type { InventoryReading } from '@/inventory/read-inventory';
import { ingredientEmoji } from '@/koi-icons';
import { messages } from '@/messages';

const text = messages.koi.stock;

/** How a field was filled by the last screenshot reading. */
type ReadMark = 'read' | 'check';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [readSummary, setReadSummary] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<number, ReadMark>>({});
  /** Collectible ingredients the user will buy instead of collecting (counted in the total). */
  const [buying, setBuying] = useState<Set<number>>(() => new Set());

  const applyReading = (reading: InventoryReading) => {
    setDialogOpen(false);
    setSaved(false);
    // Unreadable quantities keep the current value, flagged for review.
    const readValues = reading.items.filter((item) => item.quantity !== null);
    setQuantities((current) => ({
      ...current,
      ...Object.fromEntries(readValues.map((item) => [item.ingredientId, String(item.quantity)])),
    }));
    setMarks(
      Object.fromEntries(
        reading.items.map((item) => [item.ingredientId, item.quantity === null ? 'check' : 'read']),
      ),
    );
    const toCheck = reading.items.length - readValues.length;
    setReadSummary(
      text.readResult(readValues.length, toCheck, ingredients.length - reading.items.length),
    );
  };

  const parsed = ingredients.map((ingredient) => ({
    id: ingredient.id,
    quantity: parseQuantity(quantities[ingredient.id] ?? ''),
  }));
  const valid = parsed.every((entry) => entry.quantity !== null);

  // Live: reflects what is typed (or read from a print) before saving.
  const shortages = new Map<number, StockShortage>();
  for (const ingredient of ingredients) {
    const quantity = parseQuantity(quantities[ingredient.id] ?? '');
    const shortage = quantity === null ? null : stockShortage(ingredient, quantity);
    if (shortage) shortages.set(ingredient.id, shortage);
  }
  const hasMinimums = ingredients.some((ingredient) => ingredient.minStock > 0);
  const costLabel = (cost: number) => (cost > 0 ? formatMoney(cost) : null);
  const buys = (shortage: StockShortage) =>
    !shortage.ingredient.collectible || buying.has(shortage.ingredient.id);
  const restockDetail = (shortage: StockShortage) =>
    buys(shortage)
      ? shortage.cost > 0
        ? text.buyDetail(formatMoney(shortage.cost))
        : null
      : text.collectDetail(costLabel(shortage.collectCost));
  const shortageList = [...shortages.values()];
  const toggleBuying = (id: number, buy: boolean) =>
    setBuying((current) => {
      const next = new Set(current);
      if (buy) next.add(id);
      else next.delete(id);
      return next;
    });

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
        setMarks({});
        setReadSummary(null);
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

          {readSummary ? <Alert severity="info">{readSummary}</Alert> : null}
          {shortages.size > 0 ? (
            <Alert severity="warning">
              <AlertTitle>{text.shortageTitle(shortages.size)}</AlertTitle>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {shortageList.map((shortage) => (
                  <li key={shortage.ingredient.id}>
                    <Box
                      component="span"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, minHeight: 28 }}
                    >
                      {text.shortageLine(
                        shortage.ingredient.name,
                        shortage.missing,
                        restockDetail(shortage),
                      )}
                      {shortage.ingredient.collectible ? (
                        <FormControlLabel
                          sx={{ m: 0 }}
                          control={
                            <Checkbox
                              size="small"
                              sx={{ p: 0.25, mr: 0.5 }}
                              checked={buying.has(shortage.ingredient.id)}
                              onChange={(event) =>
                                toggleBuying(shortage.ingredient.id, event.target.checked)
                              }
                            />
                          }
                          label={text.buyCheckbox}
                          slotProps={{ typography: { variant: 'body2' } }}
                        />
                      ) : null}
                    </Box>
                  </li>
                ))}
              </Box>
              <Box sx={{ mt: 1, fontWeight: 700 }}>
                {text.restockTotal(formatMoney(restockCost(shortageList, buys)))}
              </Box>
              {shortageList.some((shortage) => shortage.ingredient.collectible) ? (
                <Box sx={{ mt: 0.5, fontSize: '0.8rem', opacity: 0.85 }}>{text.collectHint}</Box>
              ) : null}
            </Alert>
          ) : hasMinimums ? (
            <Alert severity="success">{text.allAboveMinimum}</Alert>
          ) : null}
          {failed ? <Alert severity="error">{text.invalid}</Alert> : null}
          {saved ? <Alert severity="success">{text.saved}</Alert> : null}

          <Grid container spacing={2} columns={{ xs: 12, md: 15 }}>
            {ingredients.map((ingredient) => {
              const value = quantities[ingredient.id] ?? '';
              const mark = marks[ingredient.id];
              const shortage = shortages.get(ingredient.id);
              const markText =
                mark === 'read'
                  ? text.readFromImage
                  : mark === 'check'
                    ? text.checkFromImage
                    : null;
              const minimumText = shortage
                ? text.belowMinimum(shortage.missing, restockDetail(shortage))
                : ingredient.minStock > 0
                  ? text.minimum(ingredient.minStock)
                  : null;
              return (
                <Grid key={ingredient.id} size={{ xs: 6, sm: 4, md: 3 }}>
                  <TextField
                    fullWidth
                    label={`${ingredientEmoji(ingredient.name)} ${ingredient.name}`}
                    value={value}
                    placeholder="0"
                    error={parseQuantity(value) === null}
                    color={mark === 'read' ? 'success' : mark === 'check' ? 'warning' : undefined}
                    focused={mark ? true : undefined}
                    helperText={
                      markText || minimumText ? (
                        <>
                          {markText ? (
                            <Box component="span" sx={{ display: 'block' }}>
                              {markText}
                            </Box>
                          ) : null}
                          {minimumText ? (
                            <Box
                              component="span"
                              sx={{
                                display: 'block',
                                color: shortage ? 'error.main' : undefined,
                                fontWeight: shortage ? 600 : undefined,
                              }}
                            >
                              {minimumText}
                            </Box>
                          ) : null}
                        </>
                      ) : undefined
                    }
                    onChange={(event) => {
                      setSaved(false);
                      setMarks(({ [ingredient.id]: _edited, ...rest }) => rest);
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

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              onClick={() => setDialogOpen(true)}
            >
              {text.readImage}
            </Button>
            <Button type="submit" variant="contained" disabled={!valid || saving}>
              {text.save}
            </Button>
          </Stack>
        </Stack>
      </CardContent>

      <KoiInventoryDialog
        open={dialogOpen}
        ingredients={ingredients}
        onClose={() => setDialogOpen(false)}
        onRead={applyReading}
      />
    </Card>
  );
}
