'use client';

import CheckIcon from '@mui/icons-material/Check';
import SaveIcon from '@mui/icons-material/Save';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
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
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { batchProfit, marginPercent, productEconomics } from '@bot/koi/pricing';
import type { KoiProductWithRecipe } from '@bot/koi/types';
import { saveStreetPrice } from '@/app/(dashboard)/koi/actions';
import { formatMoney } from '@/format';
import { messages } from '@/messages';

const text = messages.koi.margins;

function parsePrice(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && value.trim() !== '' ? parsed : null;
}

/** Cost + profit pair for one scenario, stacked in a single cell. */
function ScenarioCell({
  cost,
  profit,
  revenue,
  emphasize,
}: {
  cost: number;
  profit: number;
  revenue: number;
  emphasize?: boolean;
}) {
  return (
    <TableCell>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {text.cost} {formatMoney(cost)}
      </Typography>
      <Typography
        variant="body2"
        color={emphasize ? 'success.main' : 'text.primary'}
        sx={{ fontWeight: 600 }}
      >
        {formatMoney(profit)} ({marginPercent(profit, revenue)}%)
      </Typography>
    </TableCell>
  );
}

export function KoiMarginsTable({ products }: { products: KoiProductWithRecipe[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [streetInputs, setStreetInputs] = useState<Record<number, string>>(() =>
    Object.fromEntries(products.map((product) => [product.id, String(product.streetPrice)])),
  );
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  const rows = products.map((product) => {
    const { costBuying, costCollecting } = productEconomics(product);
    return { product, costBuying, costCollecting };
  });
  const best = [...rows].sort(
    (a, b) =>
      batchProfit(b.product, b.costCollecting, b.product.totemPrice) -
      batchProfit(a.product, a.costCollecting, a.product.totemPrice),
  )[0];

  const handleSave = (productId: number, price: number) => {
    setSavingId(productId);
    setSavedId(null);
    startTransition(async () => {
      const result = await saveStreetPrice(productId, price);
      setSavingId(null);
      if (result.ok) {
        setSavedId(productId);
        router.refresh();
      }
    });
  };

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
      <TableContainer component={Paper}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell>{text.product}</TableCell>
              <TableCell>{text.buying}</TableCell>
              <TableCell>{text.collecting}</TableCell>
              <TableCell>{text.street}</TableCell>
              <TableCell>{text.streetProfit}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(({ product, costBuying, costCollecting }) => {
              const revenueTotem = product.totemPrice * product.batchYield;
              const input = streetInputs[product.id] ?? '';
              const streetPrice = parsePrice(input);
              const dirty = streetPrice !== null && streetPrice !== product.streetPrice;
              return (
                <TableRow key={product.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {product.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {text.batchNote(product.batchYield, formatMoney(product.totemPrice))}
                    </Typography>
                  </TableCell>
                  <ScenarioCell
                    cost={costBuying}
                    profit={batchProfit(product, costBuying, product.totemPrice)}
                    revenue={revenueTotem}
                  />
                  <ScenarioCell
                    cost={costCollecting}
                    profit={batchProfit(product, costCollecting, product.totemPrice)}
                    revenue={revenueTotem}
                    emphasize
                  />
                  <TableCell>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <TextField
                        size="small"
                        value={input}
                        onChange={(event) =>
                          setStreetInputs((current) => ({
                            ...current,
                            [product.id]: event.target.value,
                          }))
                        }
                        error={streetPrice === null}
                        sx={{ width: 90 }}
                        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                      />
                      <Tooltip title={text.save}>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={!dirty || savingId === product.id}
                            onClick={() =>
                              streetPrice !== null && handleSave(product.id, streetPrice)
                            }
                          >
                            {savingId === product.id ? (
                              <CircularProgress size={18} />
                            ) : savedId === product.id && !dirty ? (
                              <CheckIcon fontSize="small" color="success" />
                            ) : (
                              <SaveIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {streetPrice === null ? (
                      <Typography variant="body2">{text.invalidPrice}</Typography>
                    ) : (
                      <>
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                          {text.collectingShort}:{' '}
                          {formatMoney(batchProfit(product, costCollecting, streetPrice))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {text.buyingShort}:{' '}
                          {formatMoney(batchProfit(product, costBuying, streetPrice))}
                        </Typography>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
