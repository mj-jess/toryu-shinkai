import { neon } from '@neondatabase/serverless';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { enrollments, koiIngredients, koiProducts, koiRecipeItems } from '@bot/db/schema';
import type { Enrollment } from '@bot/enrollment/types';
import type { KoiIngredient, KoiProductWithRecipe } from '@bot/koi/types';

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

export async function updateKoiProductPrices(
  id: number,
  totemPrice: number,
  streetPrice: number,
): Promise<void> {
  await getDb().update(koiProducts).set({ totemPrice, streetPrice }).where(eq(koiProducts.id, id));
}

export async function updateKoiIngredientPricing(
  id: number,
  values: { buyPrice: number; collectible: boolean; collectCost: number },
): Promise<void> {
  await getDb().update(koiIngredients).set(values).where(eq(koiIngredients.id, id));
}
