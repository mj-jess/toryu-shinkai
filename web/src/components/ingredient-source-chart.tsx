'use client';

import { PieChart } from '@mui/x-charts/PieChart';
import { messages } from '@/messages';
import { useChartPalette } from './chart-palette';

/** Donut of ingredients that can be collected vs must be bought. */
export function IngredientSourceChart({
  collectible,
  buyOnly,
}: {
  collectible: number;
  buyOnly: number;
}) {
  const colors = useChartPalette();
  const data = [
    { id: 'collect', label: messages.inicio.koi.collectible, value: collectible, color: colors[0] },
    { id: 'buy', label: messages.inicio.koi.buyOnly, value: buyOnly, color: colors[1] },
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
