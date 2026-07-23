'use client';

import { PieChart } from '@mui/x-charts/PieChart';
import type { Gym } from '@bot/enrollment/types';
import { gymLabels } from '@bot/messages';
import { useChartPalette } from './chart-palette';

/** Donut of active enrollments by gym. Labels carry identity (not color alone). */
export function GymDistributionChart({ byGym }: { byGym: Record<Gym, number> }) {
  const colors = useChartPalette();
  const data = [
    { id: 'sandy', label: gymLabels.sandy, value: byGym.sandy, color: colors[0] },
    { id: 'vinewood', label: gymLabels.vinewood, value: byGym.vinewood, color: colors[1] },
    { id: 'both', label: gymLabels.both, value: byGym.both, color: colors[2] },
  ].filter((entry) => entry.value > 0);

  return (
    <PieChart
      series={[
        {
          data,
          innerRadius: 55,
          arcLabel: (item) => `${item.value}`,
          highlightScope: { fade: 'global', highlight: 'item' },
        },
      ]}
      height={260}
    />
  );
}
