'use client';

import { BarChart } from '@mui/x-charts/BarChart';
import type { KoiDishProfit } from '@/stats';
import { formatMoney } from '@/format';
import { messages } from '@/messages';
import { useChartPalette } from './chart-palette';

/** Grouped bars comparing profit per batch, collecting vs buying, per dish. */
export function KoiProfitChart({ dishes }: { dishes: KoiDishProfit[] }) {
  const colors = useChartPalette();
  const money = (value: number | null) => (value === null ? '' : formatMoney(value));
  return (
    <BarChart
      xAxis={[{ data: dishes.map((dish) => dish.name), scaleType: 'band' }]}
      yAxis={[{ valueFormatter: (value: number) => formatMoney(value) }]}
      series={[
        {
          data: dishes.map((dish) => dish.collecting),
          label: messages.inicio.koi.collecting,
          color: colors[0],
          valueFormatter: money,
        },
        {
          data: dishes.map((dish) => dish.buying),
          label: messages.inicio.koi.buying,
          color: colors[1],
          valueFormatter: money,
        },
      ]}
      height={300}
    />
  );
}
