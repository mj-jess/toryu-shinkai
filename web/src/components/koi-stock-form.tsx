'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import type { KoiIngredient } from '@bot/koi/types';
import { readStockImage, saveStock } from '@/app/(dashboard)/koi/actions';
import { ingredientEmoji } from '@/koi-icons';
import { messages } from '@/messages';

const text = messages.koi.stock;

/** Claude downsizes anything larger anyway; shrinking first keeps the upload small. */
const MAX_IMAGE_EDGE = 1568;

async function downsizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
      'image/jpeg',
      0.92,
    ),
  );
}

type ReadNotice = { severity: 'success' | 'warning' | 'error'; message: string };

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
  const [reading, setReading] = useState(false);
  const [readNotice, setReadNotice] = useState<ReadNotice | null>(null);
  const [filledIds, setFilledIds] = useState<Set<number>>(() => new Set());
  const fileInput = useRef<HTMLInputElement>(null);

  const readImage = async (file: File) => {
    if (reading || !file.type.startsWith('image/')) return;
    setReading(true);
    setReadNotice(null);
    setSaved(false);
    try {
      const formData = new FormData();
      formData.append('image', await downsizeImage(file), 'inventory.jpg');
      const result = await readStockImage(formData);
      if (!result.ok) {
        setReadNotice({ severity: 'error', message: text.readErrors[result.reason] });
        return;
      }
      if (result.quantities.length === 0) {
        setReadNotice({ severity: 'warning', message: text.readNothing });
        return;
      }
      setQuantities((current) => ({
        ...current,
        ...Object.fromEntries(result.quantities.map((entry) => [entry.id, String(entry.quantity)])),
      }));
      setFilledIds(new Set(result.quantities.map((entry) => entry.id)));
      setReadNotice({
        severity: 'success',
        message: text.readResult(
          result.quantities.length,
          ingredients.length - result.quantities.length,
        ),
      });
    } catch {
      setReadNotice({ severity: 'error', message: text.readErrors.failed });
    } finally {
      setReading(false);
    }
  };

  // Ctrl+V anywhere on the tab reads a pasted screenshot.
  const readImageRef = useRef(readImage);
  readImageRef.current = readImage;
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
        item.type.startsWith('image/'),
      );
      if (!file) return;
      event.preventDefault();
      void readImageRef.current(file);
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

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
        setFilledIds(new Set());
        setReadNotice(null);
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
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}
          >
            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {text.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {text.hint}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {text.pasteHint}
              </Typography>
            </div>
            <Button
              variant="outlined"
              onClick={() => fileInput.current?.click()}
              disabled={reading}
              startIcon={reading ? <CircularProgress size={18} /> : <PhotoCameraIcon />}
              sx={{ flexShrink: 0 }}
            >
              {reading ? text.readingImage : text.readImage}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void readImage(file);
              }}
            />
          </Stack>

          {readNotice ? <Alert severity={readNotice.severity}>{readNotice.message}</Alert> : null}
          {failed ? <Alert severity="error">{text.invalid}</Alert> : null}
          {saved ? <Alert severity="success">{text.saved}</Alert> : null}

          <Grid container spacing={2} columns={{ xs: 12, md: 15 }}>
            {ingredients.map((ingredient) => {
              const value = quantities[ingredient.id] ?? '';
              const fromImage = filledIds.has(ingredient.id);
              return (
                <Grid key={ingredient.id} size={{ xs: 6, sm: 4, md: 3 }}>
                  <TextField
                    fullWidth
                    label={`${ingredientEmoji(ingredient.name)} ${ingredient.name}`}
                    value={value}
                    placeholder="0"
                    error={parseQuantity(value) === null}
                    color={fromImage ? 'success' : undefined}
                    focused={fromImage || undefined}
                    helperText={fromImage ? text.readFromImage : undefined}
                    onChange={(event) => {
                      setSaved(false);
                      setFilledIds((current) => {
                        if (!current.has(ingredient.id)) return current;
                        const next = new Set(current);
                        next.delete(ingredient.id);
                        return next;
                      });
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
            <Button type="submit" variant="contained" disabled={!valid || saving || reading}>
              {text.save}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
