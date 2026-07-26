'use client';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useRouter, useSearchParams } from 'next/navigation';
import type { KoiIngredient, KoiProductWithRecipe, KoiSale } from '@bot/koi/types';
import { messages } from '@/messages';
import { KoiCollectPlanner } from './koi-collect-planner';
import { KoiIngredientsTable } from './koi-ingredients-table';
import { KoiMarginsCards } from './koi-margins-cards';
import { KoiSalesView } from './koi-sales-view';
import { KoiStockForm } from './koi-stock-form';

/** Tabs live in the URL so links and post-save redirects land on the right one. */
export const INGREDIENTS_TAB = '/koi?tab=ingredientes';
export const SALES_TAB = '/koi?tab=vendas';

const TAB_KEYS = ['margens', 'ingredientes', 'coleta', 'vendas', 'estoque'] as const;

export function KoiView({
  products,
  ingredients,
  sales,
}: {
  products: KoiProductWithRecipe[];
  ingredients: KoiIngredient[];
  sales: KoiSale[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('tab') ?? 'margens';
  const tab = Math.max(0, TAB_KEYS.indexOf(current as (typeof TAB_KEYS)[number]));

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_event, value: number) =>
          router.replace(value === 0 ? '/koi' : `/koi?tab=${TAB_KEYS[value]}`, { scroll: false })
        }
        sx={{ mb: 2 }}
      >
        <Tab label={messages.koi.tabs.margins} />
        <Tab label={messages.koi.tabs.ingredients} />
        <Tab label={messages.koi.tabs.collect} />
        <Tab label={messages.koi.tabs.sales} />
        <Tab label={messages.koi.tabs.stock} />
      </Tabs>
      {tab === 0 ? <KoiMarginsCards products={products} /> : null}
      {tab === 1 ? <KoiIngredientsTable ingredients={ingredients} /> : null}
      {tab === 2 ? <KoiCollectPlanner products={products} /> : null}
      {tab === 3 ? <KoiSalesView sales={sales} /> : null}
      {tab === 4 ? <KoiStockForm ingredients={ingredients} /> : null}
    </Box>
  );
}
