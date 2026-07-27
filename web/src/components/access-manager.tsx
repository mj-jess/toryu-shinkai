'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import ShieldIcon from '@mui/icons-material/Shield';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AllowedUser } from '@/db';
import {
  addAccess,
  removeAccess,
  renameAccess,
  setAdmin,
  type AccessResult,
} from '@/app/(dashboard)/acessos/actions';
import { formatTimestampBR } from '@/format';
import { messages } from '@/messages';

const text = messages.access;

const DISCORD_ID = /^\d{17,20}$/;

function errorMessage(result: AccessResult): string {
  switch (result.error) {
    case 'exists':
      return text.errorExists;
    case 'core':
      return text.errorCore;
    case 'invalid':
      return text.errorInvalid;
    default:
      return text.failed;
  }
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
      {hint ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {hint}
        </Typography>
      ) : null}
      <Divider sx={{ my: 2 }} />
      {children}
    </Paper>
  );
}

export function AccessManager({
  core,
  members,
  names,
  currentId,
  currentName,
}: {
  core: string[];
  members: AllowedUser[];
  names: Record<string, string>;
  currentId: string;
  currentName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [discordId, setDiscordId] = useState('');
  const [name, setName] = useState('');
  const [asAdmin, setAsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<AllowedUser | null>(null);
  const [renaming, setRenaming] = useState<AllowedUser | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  /** A member's display name: manual label first, then the name captured on login. */
  const memberName = (member: AllowedUser) => member.label || names[member.discordId] || '—';

  const idValid = DISCORD_ID.test(discordId.trim());

  const run = (
    discordIdForRow: string | null,
    action: () => Promise<AccessResult>,
    successMessage: string,
    onSuccess?: () => void,
  ) => {
    setBusyId(discordIdForRow);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setSnack({ message: successMessage, severity: 'success' });
        onSuccess?.();
        router.refresh();
      } else if (discordIdForRow === null) {
        setError(errorMessage(result));
      } else {
        setSnack({ message: errorMessage(result), severity: 'error' });
      }
      setBusyId(null);
    });
  };

  const handleAdd = (event: FormEvent) => {
    event.preventDefault();
    if (!idValid || pending) return;
    setError(null);
    run(
      null,
      () => addAccess({ discordId: discordId.trim(), label: name.trim(), isAdmin: asAdmin }),
      text.added,
      () => {
        setDiscordId('');
        setName('');
        setAsAdmin(false);
      },
    );
  };

  const confirmRemove = () => {
    const member = confirm;
    setConfirm(null);
    if (member) run(member.discordId, () => removeAccess(member.discordId), text.removed);
  };

  const openRename = (member: AllowedUser) => {
    setRenameValue(member.label || names[member.discordId] || '');
    setRenaming(member);
  };

  const submitRename = (event: FormEvent) => {
    event.preventDefault();
    const member = renaming;
    setRenaming(null);
    if (member) {
      run(member.discordId, () => renameAccess(member.discordId, renameValue.trim()), text.renamed);
    }
  };

  return (
    <Stack spacing={3}>
      <Section title={text.addTitle}>
        <Stack component="form" spacing={2} onSubmit={handleAdd}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label={text.discordId}
                value={discordId}
                error={discordId.trim() !== '' && !idValid}
                helperText={text.discordIdHelp}
                placeholder="000000000000000000"
                onChange={(event) => setDiscordId(event.target.value)}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                fullWidth
                label={text.name}
                value={name}
                helperText={text.nameHelp}
                onChange={(event) => setName(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={asAdmin}
                    onChange={(event) => setAsAdmin(event.target.checked)}
                  />
                }
                label={text.adminFlag}
              />
            </Grid>
          </Grid>
          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<PersonAddAlt1Icon />}
              disabled={!idValid || pending}
            >
              {text.add}
            </Button>
          </Stack>
        </Stack>
      </Section>

      <Section title={text.coreTitle} hint={text.coreHint}>
        <List disablePadding>
          {core.map((id) => {
            const isMe = id === currentId;
            const label = names[id] || (isMe ? currentName : id);
            return (
              <ListItem key={id} disableGutters>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <span>{label}</span>
                      {isMe ? (
                        <Typography component="span" variant="body2" color="text.secondary">
                          {text.you}
                        </Typography>
                      ) : null}
                    </Stack>
                  }
                  secondary={text.discordLabel(id)}
                />
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={text.coreChip} color="primary" />
                  <Chip
                    size="small"
                    icon={<ShieldIcon />}
                    label={text.adminChip}
                    variant="outlined"
                  />
                </Stack>
              </ListItem>
            );
          })}
        </List>
      </Section>

      <Section title={text.membersTitle}>
        {members.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {text.membersEmpty}
          </Typography>
        ) : (
          <List disablePadding>
            {members.map((member, index) => {
              const isMe = member.discordId === currentId;
              const rowBusy = pending && busyId === member.discordId;
              return (
                <Box key={member.discordId}>
                  {index > 0 ? <Divider component="li" /> : null}
                  <ListItem
                    disableGutters
                    secondaryAction={
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Tooltip title={text.editName}>
                          <IconButton
                            size="small"
                            aria-label={text.editName}
                            disabled={pending}
                            onClick={() => openRename(member)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={text.adminToggle}>
                          <Switch
                            size="small"
                            checked={member.isAdmin}
                            disabled={pending || isMe}
                            onChange={(event) =>
                              run(
                                member.discordId,
                                () => setAdmin(member.discordId, event.target.checked),
                                text.adminChanged,
                              )
                            }
                          />
                        </Tooltip>
                        <Tooltip title={text.remove}>
                          <span>
                            <IconButton
                              edge="end"
                              color="error"
                              aria-label={text.remove}
                              disabled={pending || isMe}
                              onClick={() => setConfirm(member)}
                            >
                              <DeleteOutlineIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    }
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <span>{memberName(member)}</span>
                          {member.isAdmin ? (
                            <Chip size="small" label={text.adminChip} color="primary" />
                          ) : (
                            <Chip size="small" label={text.memberChip} variant="outlined" />
                          )}
                          {isMe ? (
                            <Typography component="span" variant="body2" color="text.secondary">
                              {text.you}
                            </Typography>
                          ) : null}
                          {rowBusy ? (
                            <Typography component="span" variant="body2" color="text.secondary">
                              …
                            </Typography>
                          ) : null}
                        </Stack>
                      }
                      secondary={`${text.discordLabel(member.discordId)}${
                        member.addedBy
                          ? ` · ${text.addedBy(member.addedBy, formatTimestampBR(member.addedAt))}`
                          : ''
                      }`}
                    />
                  </ListItem>
                </Box>
              );
            })}
          </List>
        )}
      </Section>

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
        <DialogTitle>{text.confirmRemoveTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {text.confirmRemoveBody(confirm?.label || confirm?.discordId || '')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>{text.cancel}</Button>
          <Button color="error" variant="contained" onClick={confirmRemove}>
            {text.confirmRemove}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={renaming !== null} onClose={() => setRenaming(null)} fullWidth maxWidth="xs">
        <form onSubmit={submitRename}>
          <DialogTitle>{text.editNameTitle}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label={text.name}
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRenaming(null)}>{text.cancel}</Button>
            <Button type="submit" variant="contained" disabled={pending}>
              {text.save}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snack !== null}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? (
          <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(null)}>
            {snack.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}
