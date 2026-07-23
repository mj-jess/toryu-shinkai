import Box from '@mui/material/Box';
import { notFound } from 'next/navigation';
import { EntityCard } from '@/components/entity-card';
import { KoiIngredientForm } from '@/components/koi-ingredient-form';
import { INGREDIENTS_TAB } from '@/components/koi-view';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';
import { findKoiIngredient } from '@/db';
import { messages } from '@/messages';
import { requireUser } from '@/session';

export default async function EditKoiIngredientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const ingredient = await findKoiIngredient(Number(id));
  if (!ingredient) notFound();

  return (
    <Box>
      <PageBreadcrumbs
        items={[
          { label: messages.nav.koi, href: '/koi' },
          { label: messages.koi.breadcrumbs.ingredientes, href: INGREDIENTS_TAB },
          { label: ingredient.name },
        ]}
      />
      <EntityCard title={messages.koi.edit.ingredientTitle} subheader={ingredient.name}>
        <KoiIngredientForm ingredient={ingredient} />
      </EntityCard>
    </Box>
  );
}
