'use client';

import CheckIcon from '@mui/icons-material/Check';
import SaveIcon from '@mui/icons-material/Save';
import Checkbox from '@mui/material/Checkbox';
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
import { useMemo, useState, useTransition } from 'react';
import type { KoiIngredient, KoiProductWithRecipe } from '@bot/koi/types';
import { saveIngredientPricing, saveProductPrices } from '@/app/(dashboard)/koi/actions';
import { messages } from '@/messages';

const text = messages.koi.prices;

function parsePrice(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && value.trim() !== '' ? parsed : null;
}

interface ProductDraft {
  totem: string;
  street: string;
}

interface IngredientDraft {
  buy: string;
  collectible: boolean;
  collectCost: string;
}

function SaveButton({
  saving,
  saved,
  disabled,
  onClick,
}: {
  saving: boolean;
  saved: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip title={text.save}>
      <span>
        <IconButton size="small" color="primary" disabled={disabled || saving} onClick={onClick}>
          {saving ? (
            <CircularProgress size={18} />
          ) : saved && disabled ? (
            <CheckIcon fontSize="small" color="success" />
          ) : (
            <SaveIcon fontSize="small" />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function KoiPriceEditor({ products }: { products: KoiProductWithRecipe[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const ingredients = useMemo(() => {
    const byId = new Map<number, KoiIngredient>();
    for (const product of products) {
      for (const line of product.recipe) byId.set(line.ingredient.id, line.ingredient);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [products]);

  const [productDrafts, setProductDrafts] = useState<Record<number, ProductDraft>>(() =>
    Object.fromEntries(
      products.map((product) => [
        product.id,
        { totem: String(product.totemPrice), street: String(product.streetPrice) },
      ]),
    ),
  );
  const [ingredientDrafts, setIngredientDrafts] = useState<Record<number, IngredientDraft>>(() =>
    Object.fromEntries(
      ingredients.map((ingredient) => [
        ingredient.id,
        {
          buy: String(ingredient.buyPrice),
          collectible: ingredient.collectible,
          collectCost: String(ingredient.collectCost),
        },
      ]),
    ),
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const runSave = (key: string, action: () => Promise<{ ok: boolean }>) => {
    setSavingKey(key);
    setSavedKey(null);
    startTransition(async () => {
      const result = await action();
      setSavingKey(null);
      if (result.ok) {
        setSavedKey(key);
        router.refresh();
      }
    });
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h6">{text.productsTitle}</Typography>
        <TableContainer component={Paper}>
          <Table size="small" sx={{ minWidth: 480 }}>
            <TableHead>
              <TableRow>
                <TableCell>{text.name}</TableCell>
                <TableCell>{text.totemPrice}</TableCell>
                <TableCell>{text.streetPrice}</TableCell>
                <TableCell align="center">{text.save}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => {
                const draft = productDrafts[product.id] ?? { totem: '', street: '' };
                const totem = parsePrice(draft.totem);
                const street = parsePrice(draft.street);
                const valid = totem !== null && street !== null;
                const dirty =
                  valid && (totem !== product.totemPrice || street !== product.streetPrice);
                const key = `product-${product.id}`;
                return (
                  <TableRow key={product.id} hover>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={draft.totem}
                        error={totem === null}
                        sx={{ width: 90 }}
                        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                        onChange={(event) =>
                          setProductDrafts((current) => ({
                            ...current,
                            [product.id]: { ...draft, totem: event.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={draft.street}
                        error={street === null}
                        sx={{ width: 90 }}
                        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                        onChange={(event) =>
                          setProductDrafts((current) => ({
                            ...current,
                            [product.id]: { ...draft, street: event.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <SaveButton
                        saving={savingKey === key}
                        saved={savedKey === key}
                        disabled={!dirty}
                        onClick={() =>
                          valid && runSave(key, () => saveProductPrices(product.id, totem, street))
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Stack spacing={1}>
        <Typography variant="h6">{text.ingredientsTitle}</Typography>
        <Typography variant="caption" color="text.secondary">
          {text.invalid}
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>{text.name}</TableCell>
                <TableCell>{text.buyPrice}</TableCell>
                <TableCell align="center">{text.collectible}</TableCell>
                <TableCell>{text.collectCost}</TableCell>
                <TableCell align="center">{text.save}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ingredients.map((ingredient) => {
                const draft = ingredientDrafts[ingredient.id] ?? {
                  buy: '',
                  collectible: false,
                  collectCost: '',
                };
                const buy = parsePrice(draft.buy);
                const collectCost = parsePrice(draft.collectCost);
                const valid = buy !== null && collectCost !== null;
                const dirty =
                  valid &&
                  (buy !== ingredient.buyPrice ||
                    draft.collectible !== ingredient.collectible ||
                    collectCost !== ingredient.collectCost);
                const key = `ingredient-${ingredient.id}`;
                return (
                  <TableRow key={ingredient.id} hover>
                    <TableCell>
                      <Typography variant="body2">{ingredient.name}</Typography>
                      {ingredient.note ? (
                        <Typography variant="caption" color="text.secondary">
                          {ingredient.note}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={draft.buy}
                        error={buy === null}
                        sx={{ width: 90 }}
                        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                        onChange={(event) =>
                          setIngredientDrafts((current) => ({
                            ...current,
                            [ingredient.id]: { ...draft, buy: event.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={draft.collectible}
                        onChange={(event) =>
                          setIngredientDrafts((current) => ({
                            ...current,
                            [ingredient.id]: { ...draft, collectible: event.target.checked },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={draft.collectCost}
                        error={collectCost === null}
                        disabled={!draft.collectible}
                        sx={{ width: 90 }}
                        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                        onChange={(event) =>
                          setIngredientDrafts((current) => ({
                            ...current,
                            [ingredient.id]: { ...draft, collectCost: event.target.value },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <SaveButton
                        saving={savingKey === key}
                        saved={savedKey === key}
                        disabled={!dirty}
                        onClick={() =>
                          valid &&
                          runSave(key, () =>
                            saveIngredientPricing(
                              ingredient.id,
                              buy,
                              draft.collectible,
                              collectCost,
                            ),
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Stack>
  );
}
