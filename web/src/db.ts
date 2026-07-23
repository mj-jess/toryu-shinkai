import { neon } from '@neondatabase/serverless';
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import {
  enrollments,
  koiIngredients,
  koiProducts,
  koiRecipeItems,
  koiSaleItems,
  koiSales,
} from '@bot/db/schema';
import type { Enrollment } from '@bot/enrollment/types';
import { itemsCost, itemsRevenue } from '@bot/koi/sales-summary';
import type {
  KoiIngredient,
  KoiProduct,
  KoiProductWithRecipe,
  KoiSale,
  KoiSaleItem,
} from '@bot/koi/types';

let db: NeonHttpDatabase | null = null;

/** Lazy singleton over Neon's HTTP driver — a good fit for serverless (Vercel). */
function getDb(): NeonHttpDatabase {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    db = drizzle(neon(url));
  }
  return db;
}

/** All enrollments, active first then by name — sorting/filtering happens in the grid. */
export async function listEnrollments(): Promise<Enrollment[]> {
  return getDb()
    .select()
    .from(enrollments)
    .orderBy(desc(enrollments.active), asc(sql`lower(${enrollments.name})`), asc(enrollments.id));
}

export async function findEnrollment(passport: string): Promise<Enrollment | undefined> {
  const rows = await getDb().select().from(enrollments).where(eq(enrollments.passport, passport));
  return rows[0];
}

/**
 * Mirrors src/koi/catalog.ts (loadKoiCatalog). The bot version cannot be
 * imported here: its runtime `../db/schema.js` import is NodeNext-style,
 * which the Next bundler does not resolve back to the .ts source.
 */
export async function getKoiCatalog(): Promise<KoiProductWithRecipe[]> {
  const db = getDb();
  const [products, ingredients, recipeItems] = await Promise.all([
    db.select().from(koiProducts).orderBy(asc(koiProducts.id)),
    db.select().from(koiIngredients).orderBy(asc(koiIngredients.name)),
    db.select().from(koiRecipeItems),
  ]);

  const ingredientById = new Map<number, KoiIngredient>(
    ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );
  return products.map((product) => ({
    ...product,
    recipe: recipeItems
      .filter((item) => item.productId === product.id)
      .flatMap((item) => {
        const ingredient = ingredientById.get(item.ingredientId);
        return ingredient ? [{ ingredient, quantity: item.quantity }] : [];
      }),
  }));
}

export async function getKoiIngredients(): Promise<KoiIngredient[]> {
  return getDb().select().from(koiIngredients).orderBy(asc(koiIngredients.name));
}

export async function findKoiProduct(id: number): Promise<KoiProduct | undefined> {
  const rows = await getDb().select().from(koiProducts).where(eq(koiProducts.id, id));
  return rows[0];
}

export async function findKoiIngredient(id: number): Promise<KoiIngredient | undefined> {
  const rows = await getDb().select().from(koiIngredients).where(eq(koiIngredients.id, id));
  return rows[0];
}

export async function updateKoiProduct(
  id: number,
  values: { name: string; totemPrice: number; streetPrice: number },
): Promise<void> {
  await getDb().update(koiProducts).set(values).where(eq(koiProducts.id, id));
}

export async function updateKoiIngredient(
  id: number,
  values: {
    name: string;
    buyPrice: number;
    collectible: boolean;
    collectCost: number;
    note: string | null;
  },
): Promise<void> {
  await getDb().update(koiIngredients).set(values).where(eq(koiIngredients.id, id));
}

/** Mirrors KoiSalesRepository.insert — the bot and the dashboard write alike. */
export async function insertKoiSale(sale: {
  soldAt: string;
  soldBy: string;
  soldById: string;
  items: KoiSaleItem[];
}): Promise<void> {
  const db = getDb();
  const [row] = await db
    .insert(koiSales)
    .values({
      soldAt: sale.soldAt,
      soldBy: sale.soldBy,
      soldById: sale.soldById,
      revenue: itemsRevenue(sale.items),
      cost: itemsCost(sale.items),
    })
    .returning({ id: koiSales.id });

  if (!row) throw new Error('Failed to insert KOI sale');

  await db.insert(koiSaleItems).values(
    sale.items.map((item) => ({
      saleId: row.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitCost: item.unitCost,
    })),
  );
}

/**
 * Shifts newest first, with their items. Without a range it returns every
 * shift (the index lists them all); the dashboard passes its 30-day window.
 */
export async function listKoiSales(fromIso?: string, toIso?: string): Promise<KoiSale[]> {
  const db = getDb();
  const range =
    fromIso && toIso ? and(gte(koiSales.soldAt, fromIso), lte(koiSales.soldAt, toIso)) : undefined;
  const sales = await db
    .select()
    .from(koiSales)
    .where(range)
    .orderBy(desc(koiSales.soldAt), desc(koiSales.id));
  if (sales.length === 0) return [];

  const rows = await db
    .select({
      saleId: koiSaleItems.saleId,
      productId: koiSaleItems.productId,
      productName: koiProducts.name,
      quantity: koiSaleItems.quantity,
      unitPrice: koiSaleItems.unitPrice,
      unitCost: koiSaleItems.unitCost,
    })
    .from(koiSaleItems)
    .innerJoin(koiProducts, eq(koiProducts.id, koiSaleItems.productId))
    .where(
      inArray(
        koiSaleItems.saleId,
        sales.map((sale) => sale.id),
      ),
    )
    .orderBy(asc(koiSaleItems.id));

  const bySale = new Map<number, KoiSaleItem[]>();
  for (const { saleId, ...item } of rows) {
    const list = bySale.get(saleId) ?? [];
    list.push(item);
    bySale.set(saleId, list);
  }

  return sales.map((sale) => ({ ...sale, items: bySale.get(sale.id) ?? [] }));
}
