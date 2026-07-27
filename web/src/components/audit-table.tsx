'use client';

import Box from '@mui/material/Box';
import Chip, { type ChipProps } from '@mui/material/Chip';
import MuiLink from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { ptBR } from '@mui/x-data-grid/locales';
import Link from 'next/link';
import type { AuditEventRecord } from '@bot/audit/types';
import { formatTimestampBR } from '@/format';
import { messages } from '@/messages';

const text = messages.audit;

function actionColor(action: string): ChipProps['color'] {
  switch (action) {
    case 'created':
    case 'reactivated':
      return 'success';
    case 'deactivated':
      return 'error';
    case 'renewed':
      return 'primary';
    default:
      return 'default';
  }
}

function changesToText(changes: AuditEventRecord['changes']): string {
  if (!changes || changes.length === 0) return '';
  return changes.map((change) => `${change.label}: ${change.before} → ${change.after}`).join(' · ');
}

/** The display label for the target — enrollments show "passport | name". */
function targetText(entity: string, entityRef: string | null, targetName: string): string {
  return entity === 'enrollment' && entityRef ? `${entityRef} | ${targetName}` : targetName;
}

/** Where clicking the target navigates — the record it acted on. */
function targetHref(entity: string, entityRef: string | null): string | null {
  if (entity === 'koi_stock') return '/koi?tab=estoque';
  if (!entityRef) return null;
  switch (entity) {
    case 'enrollment':
      return `/academia/${encodeURIComponent(entityRef)}`;
    case 'koi_product':
      return `/koi/pratos/${entityRef}/editar`;
    case 'koi_ingredient':
      return `/koi/ingredientes/${entityRef}/editar`;
    default:
      return null;
  }
}

const columns: GridColDef<AuditEventRecord>[] = [
  {
    field: 'action',
    headerName: text.columns.action,
    width: 170,
    valueGetter: (_value, row) => text.actionLabel(row.entity, row.action),
    renderCell: (params) => (
      <Chip
        size="small"
        label={text.actionLabel(params.row.entity, params.row.action)}
        color={actionColor(params.row.action)}
        variant={actionColor(params.row.action) === 'default' ? 'outlined' : 'filled'}
      />
    ),
  },
  {
    field: 'targetName',
    headerName: text.columns.target,
    flex: 1,
    minWidth: 180,
    valueGetter: (_value, row) => targetText(row.entity, row.entityRef, row.targetName),
    renderCell: (params) => {
      const label = targetText(params.row.entity, params.row.entityRef, params.row.targetName);
      const href = targetHref(params.row.entity, params.row.entityRef);
      return href ? (
        <MuiLink component={Link} href={href} underline="hover">
          {label}
        </MuiLink>
      ) : (
        label
      );
    },
  },
  { field: 'actor', headerName: text.columns.actor, width: 150 },
  {
    field: 'source',
    headerName: text.columns.source,
    width: 100,
    valueGetter: (_value, row) => text.sources[row.source],
    renderCell: (params) => (
      <Chip size="small" variant="outlined" label={text.sources[params.row.source]} />
    ),
  },
  {
    field: 'changes',
    headerName: text.columns.changes,
    flex: 1.4,
    minWidth: 240,
    sortable: false,
    filterable: false,
    valueGetter: (_value, row) => changesToText(row.changes),
    renderCell: (params) =>
      params.row.changes && params.row.changes.length > 0 ? (
        <Box sx={{ py: 0.75 }}>
          {params.row.changes.map((change, index) => (
            <Typography key={index} variant="caption" sx={{ display: 'block', lineHeight: 1.5 }}>
              <strong>{change.label}:</strong> {change.before} → {change.after}
            </Typography>
          ))}
        </Box>
      ) : (
        text.noChanges
      ),
  },
  {
    field: 'createdAt',
    headerName: text.columns.when,
    width: 180,
    valueFormatter: (value: string) => formatTimestampBR(value),
  },
];

export function AuditTable({ events }: { events: AuditEventRecord[] }) {
  return (
    <Paper sx={{ height: 'calc(100vh - 220px)', minHeight: 480 }}>
      <DataGrid
        rows={events}
        columns={columns}
        getRowHeight={() => 'auto'}
        localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
        showToolbar
        disableRowSelectionOnClick
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
        sx={{
          border: 0,
          '& .MuiDataGrid-cell': { alignItems: 'flex-start', py: 0.5 },
          '& .MuiDataGrid-cell[data-field="createdAt"]': { whiteSpace: 'nowrap' },
        }}
      />
    </Paper>
  );
}
