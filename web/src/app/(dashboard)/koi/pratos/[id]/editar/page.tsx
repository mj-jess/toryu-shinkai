import Box from '@mui/material/Box';
import { notFound } from 'next/navigation';
import { EntityCard } from '@/components/entity-card';
import { KoiProductForm } from '@/components/koi-product-form';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';
import { findKoiProduct } from '@/db';
import { messages } from '@/messages';
import { requireUser } from '@/session';

export default async function EditKoiProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const product = await findKoiProduct(Number(id));
  if (!product) notFound();

  return (
    <Box>
      <PageBreadcrumbs
        items={[
          { label: messages.nav.koi, href: '/koi' },
          { label: messages.koi.breadcrumbs.pratos, href: '/koi' },
          { label: product.name },
        ]}
      />
      <EntityCard title={messages.koi.edit.productTitle} subheader={product.name}>
        <KoiProductForm product={product} />
      </EntityCard>
    </Box>
  );
}
