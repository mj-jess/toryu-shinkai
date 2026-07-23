import Box from '@mui/material/Box';
import { getTodayISO } from '@bot/enrollment/format';
import { EntityCard } from '@/components/entity-card';
import { KoiSaleForm } from '@/components/koi-sale-form';
import { SALES_TAB } from '@/components/koi-view';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';
import { getKoiCatalog } from '@/db';
import { messages } from '@/messages';
import { requireUser } from '@/session';

export default async function NewKoiSalePage() {
  await requireUser();
  const products = await getKoiCatalog();
  const text = messages.koi.sales;

  return (
    <Box>
      <PageBreadcrumbs
        items={[
          { label: messages.nav.koi, href: '/koi' },
          { label: text.breadcrumb, href: SALES_TAB },
          { label: text.newBreadcrumb },
        ]}
      />
      <EntityCard title={text.registerTitle} subheader={text.registerHint}>
        <KoiSaleForm products={products} today={getTodayISO()} />
      </EntityCard>
    </Box>
  );
}
