'use client';

import { BarChart } from '@mui/x-charts/BarChart';
import { formatDateBR } from '@bot/enrollment/format';
import type { DayTotal } from '@bot/koi/sales-summary';
import { formatMoney } from '@/format';
import { messages } from '@/messages';
import { useChartPalette } from './chart-palette';

/** Revenue and estimated profit per day — two series, so the legend is shown. */
export function SalesPerDayChart({ days, height = 260 }: { days: DayTotal[]; height?: number }) {
  const colors = useChartPalette();
  const money = (value: number | null) => (value === null ? '' : formatMoney(value));
  return (
    <BarChart
      xAxis={[{ data: days.map((day) => formatDateBR(day.date).slice(0, 5)), scaleType: 'band' }]}
      yAxis={[{ valueFormatter: (value: number) => formatMoney(value) }]}
      series={[
        {
          data: days.map((day) => day.revenue),
          label: messages.koi.sales.revenue,
          color: colors[0],
          valueFormatter: money,
        },
        {
          data: days.map((day) => day.profit),
          label: messages.koi.sales.profit,
          color: colors[1],
          valueFormatter: money,
        },
      ]}
      height={height}
    />
  );
}
