'use client';

import CheckIcon from '@mui/icons-material/Check';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import type { KoiIngredient, KoiProductWithRecipe } from '@bot/koi/types';
import { StatCard } from '@/components/stat-card';
import { formatMoney } from '@/format';
import { ingredientEmoji, productEmoji } from '@/koi-icons';
import { messages } from '@/messages';

const text = messages.koi.collect;

function parseUnits(value: string): number | null {
  if (value.trim() === '') return 0;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

interface IngredientNeed {
  ingredient: KoiIngredient;
  quantity: number;
}

export function KoiCollectPlanner({ products }: { products: KoiProductWithRecipe[] }) {
  const [units, setUnits] = useState<Record<number, string>>({});
  // Stock starts filled from what the Estoque tab saved; edits here are just for
  // the simulation and never write back to the stored stock.
  const [stock, setStock] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const product of products) {
      for (const line of product.recipe) {
        if (initial[line.ingredient.id] === undefined) {
          initial[line.ingredient.id] =
            line.ingredient.stockQuantity > 0 ? String(line.ingredient.stockQuantity) : '';
        }
      }
    }
    return initial;
  });

  // Production runs in whole batches, so requested units round up to a batch.
  const parsed = products.map((product) => {
    const requested = parseUnits(units[product.id] ?? '');
    const batches = requested && requested > 0 ? Math.ceil(requested / product.batchYield) : 0;
    return { product, requested, batches, produced: batches * product.batchYield };
  });

  const foods = parsed.filter((entry) => entry.product.category === 'food');
  const drinks = parsed.filter((entry) => entry.product.category === 'drink');

  const needs = useMemo(() => {
    const totals = new Map<number, IngredientNeed>();
    for (const { product, batches: count } of parsed) {
      if (!count) continue;
      for (const line of product.recipe) {
        const current = totals.get(line.ingredient.id);
        const quantity = line.quantity * count + (current?.quantity ?? 0);
        totals.set(line.ingredient.id, { ingredient: line.ingredient, quantity });
      }
    }
    // Things to buy first (they cost money and gate production), then the rest.
    return [...totals.values()].sort((a, b) => {
      if (a.ingredient.collectible !== b.ingredient.collectible) {
        return a.ingredient.collectible ? 1 : -1;
      }
      return a.ingredient.name.localeCompare(b.ingredient.name, 'pt-BR');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, products]);

  /** How much is still missing after what is already in stock. */
  const missingOf = (need: IngredientNeed): number => {
    const have = parseUnits(stock[need.ingredient.id] ?? '') ?? 0;
    return Math.max(0, need.quantity - have);
  };
  const unitCostOf = (ingredient: KoiIngredient): number =>
    ingredient.collectible ? ingredient.collectCost : ingredient.buyPrice;

  /** Per-row shortcut: "I have all of this one" — its stock covers the need. */
  const fillRow = (ingredientId: number, quantity: number) =>
    setStock((current) => ({ ...current, [ingredientId]: String(quantity) }));

  const unitsToProduce = parsed.reduce((total, entry) => total + entry.produced, 0);
  // Costs are for what is still missing — collect the collectibles, buy the rest.
  const buyCost = needs.reduce(
    (total, need) => total + unitCostOf(need.ingredient) * missingOf(need),
    0,
  );
  const buyAllCost = needs.reduce(
    (total, need) => total + need.ingredient.buyPrice * missingOf(need),
    0,
  );

  const renderInputs = (entries: typeof parsed) => (
    <Grid container spacing={2}>
      {entries.map(({ product, requested, batches: count, produced }) => (
        <Grid key={product.id} size={{ xs: 6, sm: 4, md: 3 }}>
          <TextField
            fullWidth
            label={`${productEmoji(product.name)} ${product.name}`}
            value={units[product.id] ?? ''}
            error={requested === null}
            placeholder="0"
            helperText={count > 0 ? text.batchesNote(count, produced) : text.unitsField}
            onChange={(event) =>
              setUnits((current) => ({ ...current, [product.id]: event.target.value }))
            }
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {text.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {text.hint}
          </Typography>

          <Typography variant="overline" color="text.secondary">
            {text.foods}
          </Typography>
          {renderInputs(foods)}

          {drinks.length > 0 ? (
            <>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ display: 'block', mt: 2 }}
              >
                {text.drinks}
              </Typography>
              {renderInputs(drinks)}
            </>
          ) : null}
        </CardContent>
      </Card>

      {needs.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {text.empty}
          </Typography>
        </Paper>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard label={text.unitsToProduce} value={unitsToProduce} color="primary" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard
                label={text.buyCost}
                value={formatMoney(buyCost)}
                caption={text.buyCostCaption}
                color="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard label={text.buyAllCost} value={formatMoney(buyAllCost)} />
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {text.ingredientsTitle}
              </Typography>
              <TableContainer>
                <Table size="small" sx={{ minWidth: 620 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{text.ingredient}</TableCell>
                      <TableCell align="right">{text.needed}</TableCell>
                      <TableCell align="right">{text.inStock}</TableCell>
                      <TableCell align="right">{text.toGet}</TableCell>
                      <TableCell align="center">{text.source}</TableCell>
                      <TableCell align="right">{text.cost}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {needs.map((need) => {
                      const { ingredient, quantity } = need;
                      const missing = missingOf(need);
                      return (
                        <TableRow key={ingredient.id} hover>
                          <TableCell>
                            {ingredientEmoji(ingredient.name)} {ingredient.name}
                          </TableCell>
                          <TableCell align="right">{quantity}</TableCell>
                          <TableCell align="right">
                            <Stack
                              direction="row"
                              spacing={0.5}
                              sx={{ alignItems: 'center', justifyContent: 'flex-end' }}
                            >
                              <TextField
                                variant="standard"
                                value={stock[ingredient.id] ?? ''}
                                placeholder="0"
                                onChange={(event) =>
                                  setStock((current) => ({
                                    ...current,
                                    [ingredient.id]: event.target.value,
                                  }))
                                }
                                sx={{ width: 56 }}
                                slotProps={{
                                  htmlInput: {
                                    inputMode: 'numeric',
                                    style: { textAlign: 'right' },
                                  },
                                }}
                              />
                              <Tooltip title={text.fillRow}>
                                <IconButton
                                  size="small"
                                  color={missing === 0 ? 'success' : 'default'}
                                  onClick={() => fillRow(ingredient.id, quantity)}
                                >
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {missing}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={ingredient.collectible ? text.collect : text.buy}
                              color={ingredient.collectible ? 'success' : 'default'}
                              variant={ingredient.collectible ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {unitCostOf(ingredient) > 0 && missing > 0
                              ? formatMoney(unitCostOf(ingredient) * missing)
                              : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  );
}
