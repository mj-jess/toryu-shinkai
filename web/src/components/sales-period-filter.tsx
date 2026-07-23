'use client';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useRouter, useSearchParams } from 'next/navigation';
import { messages } from '@/messages';
import { SALES_PERIODS, type SalesPeriod } from '@/sales-periods';

const LABEL: Record<SalesPeriod, string> = {
  7: messages.koi.sales.period7,
  30: messages.koi.sales.period30,
  90: messages.koi.sales.period90,
};

/** Period the KOI sales summary covers — kept in the URL (?dias=30). */
export function SalesPeriodFilter({ period }: { period: SalesPeriod }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const change = (value: SalesPeriod) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('dias', String(value));
    router.replace(`/inicio?${params.toString()}`, { scroll: false });
  };

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={period}
      onChange={(_event, value: SalesPeriod | null) => value && change(value)}
    >
      {SALES_PERIODS.map((days) => (
        <ToggleButton key={days} value={days}>
          {LABEL[days]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
