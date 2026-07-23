'use client';

import { BarChart } from '@mui/x-charts/BarChart';
import type { MonthBucket } from '@/stats';
import { useChartPalette } from './chart-palette';

/** New enrollments per month — a single series, so no legend is needed. */
export function EnrollmentsPerMonthChart({ months }: { months: MonthBucket[] }) {
  const colors = useChartPalette();
  return (
    <BarChart
      xAxis={[{ data: months.map((month) => month.label), scaleType: 'band' }]}
      series={[{ data: months.map((month) => month.count), color: colors[0] }]}
      height={260}
    />
  );
}
