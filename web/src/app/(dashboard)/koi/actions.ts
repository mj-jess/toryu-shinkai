'use server';

import { revalidatePath } from 'next/cache';
import { getKoiCatalog, updateKoiIngredientPricing, updateKoiProductPrices } from '@/db';
import { requireUser } from '@/session';

export interface SaveResult {
  ok: boolean;
}

function isPrice(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export async function saveProductPrices(
  id: number,
  totemPrice: number,
  streetPrice: number,
): Promise<SaveResult> {
  await requireUser();
  if (!Number.isInteger(id) || !isPrice(totemPrice) || !isPrice(streetPrice)) {
    return { ok: false };
  }
  await updateKoiProductPrices(id, totemPrice, streetPrice);
  revalidatePath('/koi');
  return { ok: true };
}

export async function saveStreetPrice(id: number, streetPrice: number): Promise<SaveResult> {
  await requireUser();
  if (!Number.isInteger(id) || !isPrice(streetPrice)) return { ok: false };
  const product = (await getKoiCatalog()).find((candidate) => candidate.id === id);
  if (!product) return { ok: false };
  await updateKoiProductPrices(id, product.totemPrice, streetPrice);
  revalidatePath('/koi');
  return { ok: true };
}

export async function saveIngredientPricing(
  id: number,
  buyPrice: number,
  collectible: boolean,
  collectCost: number,
): Promise<SaveResult> {
  await requireUser();
  if (!Number.isInteger(id) || !isPrice(buyPrice) || !isPrice(collectCost)) {
    return { ok: false };
  }
  await updateKoiIngredientPricing(id, { buyPrice, collectible, collectCost });
  revalidatePath('/koi');
  return { ok: true };
}
