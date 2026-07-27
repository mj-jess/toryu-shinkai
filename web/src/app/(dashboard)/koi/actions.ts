'use server';

import { revalidatePath } from 'next/cache';
import type { AuditChangeLine } from '@bot/audit/types';
import { priceSaleItems } from '@bot/koi/pricing';
import type { KoiCategory } from '@bot/koi/types';
import {
  findKoiIngredient,
  findKoiProduct,
  getKoiCatalog,
  getKoiIngredients,
  insertAuditEvent,
  insertKoiSale,
  updateKoiIngredient,
  updateKoiProduct,
  updateKoiStock,
} from '@/db';
import { formatMoney, nowTimestampBR } from '@/format';
import { messages } from '@/messages';
import { requireUser } from '@/session';

export interface SaveResult {
  ok: boolean;
}

function isPrice(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function categoryLabel(category: KoiCategory): string {
  return category === 'drink' ? messages.koi.edit.categoryDrink : messages.koi.edit.categoryFood;
}

/** Records a KOI catalog change in the audit trail — never breaks the flow. */
async function logKoi(
  actor: string,
  entity: string,
  entityRef: string | null,
  targetName: string,
  changes: AuditChangeLine[],
): Promise<void> {
  if (changes.length === 0) return;
  try {
    await insertAuditEvent({
      createdAt: nowTimestampBR(),
      actor,
      source: 'dashboard',
      entity,
      action: 'updated',
      entityRef,
      targetName,
      changes,
    });
  } catch (error) {
    console.error('Failed to record KOI audit event:', error);
  }
}

export async function saveProduct(
  id: number,
  values: { name: string; category: KoiCategory; totemPrice: number; streetPrice: number },
): Promise<SaveResult> {
  const user = await requireUser();
  const name = values.name.trim();
  if (
    !Number.isInteger(id) ||
    !name ||
    (values.category !== 'food' && values.category !== 'drink') ||
    !isPrice(values.totemPrice) ||
    !isPrice(values.streetPrice)
  ) {
    return { ok: false };
  }
  const before = await findKoiProduct(id);
  await updateKoiProduct(id, { ...values, name });
  if (before) {
    const t = messages.koi.edit;
    const changes: AuditChangeLine[] = [];
    if (name !== before.name) changes.push({ label: t.name, before: before.name, after: name });
    if (values.category !== before.category) {
      changes.push({
        label: t.category,
        before: categoryLabel(before.category),
        after: categoryLabel(values.category),
      });
    }
    if (values.totemPrice !== before.totemPrice) {
      changes.push({
        label: t.totemPrice,
        before: formatMoney(before.totemPrice),
        after: formatMoney(values.totemPrice),
      });
    }
    if (values.streetPrice !== before.streetPrice) {
      changes.push({
        label: t.streetPrice,
        before: formatMoney(before.streetPrice),
        after: formatMoney(values.streetPrice),
      });
    }
    await logKoi(user.name, 'koi_product', String(id), name, changes);
  }
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

/** Bulk-updates the on-hand stock quantities from the Estoque tab. */
export async function saveStock(
  entries: { id: number; stockQuantity: number }[],
): Promise<SaveResult> {
  const user = await requireUser();
  const valid = entries.every(
    (entry) =>
      Number.isInteger(entry.id) &&
      Number.isInteger(entry.stockQuantity) &&
      entry.stockQuantity >= 0,
  );
  if (!valid) return { ok: false };
  const before = await getKoiIngredients();
  await updateKoiStock(entries);
  const beforeById = new Map(before.map((ingredient) => [ingredient.id, ingredient]));
  const changes: AuditChangeLine[] = [];
  for (const entry of entries) {
    const prev = beforeById.get(entry.id);
    if (prev && prev.stockQuantity !== entry.stockQuantity) {
      changes.push({
        label: prev.name,
        before: String(prev.stockQuantity),
        after: String(entry.stockQuantity),
      });
    }
  }
  await logKoi(user.name, 'koi_stock', null, messages.koi.tabs.stock, changes);
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
  const user = await requireUser();
  const name = values.name.trim();
  if (!Number.isInteger(id) || !name || !isPrice(values.buyPrice) || !isPrice(values.collectCost)) {
    return { ok: false };
  }
  const collectCost = values.collectible ? values.collectCost : 0;
  const note = values.note.trim() || null;
  const before = await findKoiIngredient(id);
  await updateKoiIngredient(id, {
    name,
    buyPrice: values.buyPrice,
    collectible: values.collectible,
    collectCost,
    note,
  });
  if (before) {
    const t = messages.koi.ingredients;
    const changes: AuditChangeLine[] = [];
    if (name !== before.name) changes.push({ label: t.name, before: before.name, after: name });
    if (values.buyPrice !== before.buyPrice) {
      changes.push({
        label: t.buyPrice,
        before: formatMoney(before.buyPrice),
        after: formatMoney(values.buyPrice),
      });
    }
    if (values.collectible !== before.collectible) {
      changes.push({
        label: t.collectible,
        before: before.collectible ? t.yes : t.no,
        after: values.collectible ? t.yes : t.no,
      });
    }
    if (collectCost !== before.collectCost) {
      changes.push({
        label: t.collectCost,
        before: formatMoney(before.collectCost),
        after: formatMoney(collectCost),
      });
    }
    if (note !== before.note) {
      changes.push({
        label: messages.koi.edit.note,
        before: before.note ?? '—',
        after: note ?? '—',
      });
    }
    await logKoi(user.name, 'koi_ingredient', String(id), name, changes);
  }
  revalidatePath('/koi');
  return { ok: true };
}
