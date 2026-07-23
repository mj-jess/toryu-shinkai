'use client';

import EditIcon from '@mui/icons-material/Edit';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useState } from 'react';
import { batchProfit, marginPercent, productEconomics } from '@bot/koi/pricing';
import type { KoiProductWithRecipe } from '@bot/koi/types';
import { formatMoney } from '@/format';
import { productEmoji } from '@/koi-icons';
import { messages } from '@/messages';

const text = messages.koi.margins;

function parsePrice(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && value.trim() !== '' ? parsed : null;
}

/** A profit value with its margin percent underneath. */
function ProfitCell({
  profit,
  revenue,
  emphasize,
}: {
  profit: number;
  revenue: number;
  emphasize?: boolean;
}) {
  return (
    <TableCell align="right" sx={{ border: 0 }}>
      <Typography
        variant="body2"
        color={emphasize ? 'success.main' : 'text.primary'}
        sx={{ fontWeight: emphasize ? 700 : 600 }}
      >
        {formatMoney(profit)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        ({marginPercent(profit, revenue)}%)
      </Typography>
    </TableCell>
  );
}

export function KoiMarginsCards({ products }: { products: KoiProductWithRecipe[] }) {
  // Simulation only — the official street price is changed on the edit page.
  const [streetInputs, setStreetInputs] = useState<Record<number, string>>(() =>
    Object.fromEntries(products.map((product) => [product.id, String(product.streetPrice)])),
  );

  const rows = products.map((product) => {
    const { costBuying, costCollecting } = productEconomics(product);
    return { product, costBuying, costCollecting };
  });
  const best = [...rows].sort(
    (a, b) =>
      batchProfit(b.product, b.costCollecting, b.product.totemPrice) -
      batchProfit(a.product, a.costCollecting, a.product.totemPrice),
  )[0];

  return (
    <Stack spacing={2}>
      {best ? (
        <Alert severity="success">
          {messages.koi.highlight(
            best.product.name,
            formatMoney(batchProfit(best.product, best.costCollecting, best.product.totemPrice)),
          )}
        </Alert>
      ) : null}
      <Grid container spacing={2}>
        {rows.map(({ product, costBuying, costCollecting }) => {
          const revenue = product.totemPrice * product.batchYield;
          const profitBuying = batchProfit(product, costBuying, product.totemPrice);
          const profitCollecting = batchProfit(product, costCollecting, product.totemPrice);
          const input = streetInputs[product.id] ?? '';
          const streetPrice = parsePrice(input);
          return (
            <Grid key={product.id} size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6">
                    {productEmoji(product.name)} {product.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {text.batchHeader(product.batchYield, formatMoney(product.totemPrice))}
                  </Typography>

                  <Table size="small" sx={{ mt: 1.5 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ border: 0 }} />
                        <TableCell align="right" sx={{ border: 0 }}>
                          {text.buying}
                        </TableCell>
                        <TableCell align="right" sx={{ border: 0, color: 'success.main' }}>
                          {text.collecting}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ border: 0 }}>{text.costLabel}</TableCell>
                        <TableCell align="right" sx={{ border: 0 }}>
                          {formatMoney(costBuying)}
                        </TableCell>
                        <TableCell align="right" sx={{ border: 0 }}>
                          {formatMoney(costCollecting)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ border: 0 }}>{text.profitLabel}</TableCell>
                        <ProfitCell profit={profitBuying} revenue={revenue} />
                        <ProfitCell profit={profitCollecting} revenue={revenue} emphasize />
                      </TableRow>
                    </TableBody>
                  </Table>

                  <Divider sx={{ my: 2 }} />

                  <TextField
                    label={text.street}
                    size="small"
                    value={input}
                    error={streetPrice === null}
                    onChange={(event) =>
                      setStreetInputs((current) => ({
                        ...current,
                        [product.id]: event.target.value,
                      }))
                    }
                    sx={{ width: 160 }}
                    slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                  />
                  <Box sx={{ mt: 1 }}>
                    {streetPrice === null ? (
                      <Typography variant="body2">{text.invalidPrice}</Typography>
                    ) : (
                      <>
                        <Typography variant="caption" color="text.secondary">
                          {text.streetResult}
                        </Typography>
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                          {text.collectingShort}:{' '}
                          {formatMoney(batchProfit(product, costCollecting, streetPrice))}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {text.buyingShort}:{' '}
                          {formatMoney(batchProfit(product, costBuying, streetPrice))}
                        </Typography>
                      </>
                    )}
                  </Box>

                  <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      component={Link}
                      href={`/koi/pratos/${product.id}/editar`}
                      size="small"
                      startIcon={<EditIcon />}
                    >
                      {text.edit}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
