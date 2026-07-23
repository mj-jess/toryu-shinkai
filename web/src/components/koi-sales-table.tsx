'use client';

import Paper from '@mui/material/Paper';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { ptBR } from '@mui/x-data-grid/locales';
import { formatDateBR } from '@bot/enrollment/format';
import type { KoiSale } from '@bot/koi/types';
import { formatMoney } from '@/format';
import { productEmoji } from '@/koi-icons';
import { messages } from '@/messages';

const text = messages.koi.sales;

const columns: GridColDef<KoiSale>[] = [
  {
    field: 'soldAt',
    headerName: text.historyDate,
    width: 120,
    valueFormatter: (value: string) => formatDateBR(value),
  },
  { field: 'soldBy', headerName: text.historySeller, width: 160 },
  {
    field: 'items',
    headerName: text.historyItems,
    flex: 1,
    minWidth: 220,
    sortable: false,
    filterable: false,
    valueGetter: (_value, row) =>
      row.items.map((item) => `${productEmoji(item.productName)} ${item.quantity}`).join(' · '),
  },
  {
    field: 'revenue',
    headerName: text.historyRevenue,
    width: 140,
    type: 'number',
    valueFormatter: (value: number) => formatMoney(value),
  },
  {
    field: 'profit',
    headerName: text.historyProfit,
    width: 140,
    type: 'number',
    valueGetter: (_value, row) => row.revenue - row.cost,
    valueFormatter: (value: number) => formatMoney(value),
  },
];

export function KoiSalesTable({ sales }: { sales: KoiSale[] }) {
  return (
    <Paper sx={{ height: 'calc(100vh - 360px)', minHeight: 400 }}>
      <DataGrid
        rows={sales}
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
