'use server';

import { revalidatePath } from 'next/cache';
import { updateKoiIngredient, updateKoiProduct } from '@/db';
import { requireUser } from '@/session';

export interface SaveResult {
  ok: boolean;
}

function isPrice(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export async function saveProduct(
  id: number,
  values: { name: string; totemPrice: number; streetPrice: number },
): Promise<SaveResult> {
  await requireUser();
  const name = values.name.trim();
  if (
    !Number.isInteger(id) ||
    !name ||
    !isPrice(values.totemPrice) ||
    !isPrice(values.streetPrice)
  ) {
    return { ok: false };
  }
  await updateKoiProduct(id, { ...values, name });
  revalidatePath('/koi');
  return { ok: true };
}

export async function saveIngredient(
  id: number,
  values: {
    name: string;
    buyPrice: number;
    collectible: boolean;
    collectCost: number;
    note: string;
  },
): Promise<SaveResult> {
  await requireUser();
  const name = values.name.trim();
  if (!Number.isInteger(id) || !name || !isPrice(values.buyPrice) || !isPrice(values.collectCost)) {
    return { ok: false };
  }
  await updateKoiIngredient(id, {
    name,
    buyPrice: values.buyPrice,
    collectible: values.collectible,
    collectCost: values.collectible ? values.collectCost : 0,
    note: values.note.trim() || null,
  });
  revalidatePath('/koi');
  return { ok: true };
}
