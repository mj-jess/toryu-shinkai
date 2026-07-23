'use client';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useRouter, useSearchParams } from 'next/navigation';
import type { KoiIngredient, KoiProductWithRecipe } from '@bot/koi/types';
import { messages } from '@/messages';
import { KoiIngredientsTable } from './koi-ingredients-table';
import { KoiMarginsCards } from './koi-margins-cards';

/** The Ingredientes tab is reflected in the URL so returning lands on it. */
export const INGREDIENTS_TAB = '/koi?tab=ingredientes';

export function KoiView({
  products,
  ingredients,
}: {
  products: KoiProductWithRecipe[];
  ingredients: KoiIngredient[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') === 'ingredientes' ? 1 : 0;

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_event, value: number) =>
          router.replace(value === 1 ? INGREDIENTS_TAB : '/koi', { scroll: false })
        }
        sx={{ mb: 2 }}
      >
        <Tab label={messages.koi.tabs.margins} />
        <Tab label={messages.koi.tabs.ingredients} />
      </Tabs>
      {tab === 0 ? (
        <KoiMarginsCards products={products} />
      ) : (
        <KoiIngredientsTable ingredients={ingredients} />
      )}
    </Box>
  );
}
