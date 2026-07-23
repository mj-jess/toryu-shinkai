'use server';

import { revalidatePath } from 'next/cache';
import { priceSaleItems } from '@bot/koi/pricing';
import { getKoiCatalog, insertKoiSale, updateKoiIngredient, updateKoiProduct } from '@/db';
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

export interface SaleResult {
  ok: boolean;
  /** True when the session predates the Discord id claim — sign in again. */
  needsLogin?: boolean;
  /** Filled on success so the page can show what was registered. */
  units?: number;
  revenue?: number;
  profit?: number;
}

/**
 * Registers a street-sale shift from the dashboard — same data the Discord
 * modal writes: a date plus quantities, priced by the current street prices.
 */
export async function registerSale(
  soldAt: string,
  quantities: { productId: number; quantity: number }[],
): Promise<SaleResult> {
  const user = await requireUser();
  // Without the seller id the shift would not merge with the same member's
  // other registrations in the rankings — refuse instead of storing it.
  if (!user.discordId) return { ok: false, needsLogin: true };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(soldAt)) return { ok: false };

  const clean = quantities.filter(
    (entry) => Number.isInteger(entry.quantity) && entry.quantity > 0,
  );
  if (clean.length === 0) return { ok: false };

  const items = priceSaleItems(await getKoiCatalog(), clean);
  if (items.length === 0) return { ok: false };

  await insertKoiSale({
    soldAt,
    soldBy: user.name,
    soldById: user.discordId,
    items,
  });

  revalidatePath('/koi');
  revalidatePath('/inicio');

  const revenue = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const cost = items.reduce((total, item) => total + item.unitCost * item.quantity, 0);
  return {
    ok: true,
    units: items.reduce((total, item) => total + item.quantity, 0),
    revenue,
    profit: revenue - cost,
  };
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
