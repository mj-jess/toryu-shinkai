'use client';

import ImageIcon from '@mui/icons-material/Image';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { readInventory, type InventoryReading } from '@/inventory/read-inventory';
import { messages } from '@/messages';

const text = messages.koi.stock;

type Status =
  | { kind: 'idle'; error?: string }
  | { kind: 'reading'; preview: string; done: number; total: number };

/**
 * Picks an inventory screenshot (drop, paste or file picker) and reads it in the
 * browser. The image only lives in memory (plus a temporary object URL for the
 * preview) and is dropped when the dialog closes.
 */
export function KoiInventoryDialog({
  open,
  ingredients,
  onClose,
  onRead,
}: {
  open: boolean;
  ingredients: { id: number; name: string }[];
  onClose: () => void;
  onRead: (reading: InventoryReading) => void;
}) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const reading = status.kind === 'reading';

  const read = async (file: File) => {
    if (reading) return;
    if (!file.type.startsWith('image/')) {
      setStatus({ kind: 'idle', error: text.notAnImage });
      return;
    }
    const preview = URL.createObjectURL(file);
    setStatus({ kind: 'reading', preview, done: 0, total: 0 });
    try {
      const result = await readInventory(file, ingredients, (done, total) =>
        setStatus({ kind: 'reading', preview, done, total }),
      );
      if (result.slots === 0) {
        setStatus({ kind: 'idle', error: text.noSlots });
      } else if (result.items.length === 0) {
        setStatus({ kind: 'idle', error: text.readNothing });
      } else {
        setStatus({ kind: 'idle' });
        onRead(result);
      }
    } catch (error) {
      console.error('Inventory reading failed:', error);
      setStatus({ kind: 'idle', error: text.readFailed });
    } finally {
      URL.revokeObjectURL(preview);
    }
  };

  // Ctrl+V while the dialog is open.
  const readRef = useRef(read);
  readRef.current = read;
  useEffect(() => {
    if (!open) return;
    const handlePaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
        item.type.startsWith('image/'),
      );
      if (!file) return;
      event.preventDefault();
      void readRef.current(file);
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [open]);

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void read(file);
  };

  const close = () => {
    if (reading) return;
    setStatus({ kind: 'idle' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>{text.dialogTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {status.kind === 'idle' && status.error ? (
            <Alert severity="warning">{status.error}</Alert>
          ) : null}

          {status.kind === 'reading' ? (
            <Stack spacing={2} sx={{ alignItems: 'center', py: 2 }}>
              <img
                src={status.preview}
                alt=""
                style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8 }}
              />
              <Box sx={{ width: '100%' }}>
                <LinearProgress
                  variant={status.total > 0 ? 'determinate' : 'indeterminate'}
                  value={status.total > 0 ? (status.done / status.total) * 100 : 0}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {text.reading(status.done, status.total)}
              </Typography>
            </Stack>
          ) : (
            <Box
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              sx={{
                border: 2,
                borderStyle: 'dashed',
                borderColor: dragging ? 'primary.main' : 'divider',
                bgcolor: dragging ? 'action.hover' : 'transparent',
                borderRadius: 2,
                px: 3,
                py: 5,
                textAlign: 'center',
                transition: 'border-color 120ms, background-color 120ms',
              }}
            >
              <Stack spacing={2} sx={{ alignItems: 'center' }}>
                <ImageIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                <Typography>{dragging ? text.dropActive : text.dropHint}</Typography>
                <Button variant="outlined" onClick={() => fileInput.current?.click()}>
                  {text.chooseImage}
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void read(file);
                  }}
                />
              </Stack>
            </Box>
          )}

          <Typography variant="caption" color="text.secondary">
            {text.privacyNote} {text.firstUseNote}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={reading}>
          {text.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
