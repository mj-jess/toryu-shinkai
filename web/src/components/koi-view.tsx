'use client';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useState } from 'react';
import type { KoiProductWithRecipe } from '@bot/koi/types';
import { messages } from '@/messages';
import { KoiMarginsTable } from './koi-margins-table';
import { KoiPriceEditor } from './koi-price-editor';

export function KoiView({ products }: { products: KoiProductWithRecipe[] }) {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Tabs value={tab} onChange={(_event, value: number) => setTab(value)} sx={{ mb: 2 }}>
        <Tab label={messages.koi.tabs.margins} />
        <Tab label={messages.koi.tabs.prices} />
      </Tabs>
      {tab === 0 ? <KoiMarginsTable products={products} /> : <KoiPriceEditor products={products} />}
    </Box>
  );
}
