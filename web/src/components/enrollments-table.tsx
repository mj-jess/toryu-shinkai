'use client';

import VisibilityIcon from '@mui/icons-material/Visibility';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { ptBR } from '@mui/x-data-grid/locales';
import Link from 'next/link';
import type { Enrollment } from '@bot/enrollment/types';
import { messages } from '@/messages';

const { columns: columnLabels, statusActive, statusInactive, view } = messages.enrollments;

const columns: GridColDef<Enrollment>[] = [
  { field: 'passport', headerName: columnLabels.passport, width: 130 },
  { field: 'name', headerName: columnLabels.name, flex: 1, minWidth: 200 },
  { field: 'phone', headerName: columnLabels.phone, width: 160 },
  {
    field: 'status',
    headerName: columnLabels.status,
    width: 130,
    type: 'singleSelect',
    valueOptions: [statusActive, statusInactive],
    valueGetter: (_value, row) => (row.active ? statusActive : statusInactive),
    renderCell: (params) => (
      <Chip
        size="small"
        label={params.value}
        color={params.row.active ? 'success' : 'default'}
        variant={params.row.active ? 'filled' : 'outlined'}
      />
    ),
  },
  {
    field: 'actions',
    headerName: columnLabels.actions,
    width: 90,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => (
      <Tooltip title={view}>
        <IconButton
          component={Link}
          href={`/matriculas/${encodeURIComponent(params.row.passport)}`}
          size="small"
          aria-label={view}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    ),
  },
];

export function EnrollmentsTable({ rows }: { rows: Enrollment[] }) {
  return (
    <Paper sx={{ height: 'calc(100vh - 280px)', minHeight: 480 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
        showToolbar
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        sx={{ border: 0 }}
      />
    </Paper>
  );
}
