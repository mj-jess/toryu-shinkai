import { asc } from 'drizzle-orm';
import type { Database } from '../database.js';
import { koiIngredients, koiProducts, koiRecipeItems } from '../db/schema.js';
import type { KoiProductWithRecipe } from './types.js';

/** Loads the full KOI catalog: products with recipes and ingredients resolved. */
export async function loadKoiCatalog(db: Database): Promise<KoiProductWithRecipe[]> {
  const [products, ingredients, recipeItems] = await Promise.all([
    db.select().from(koiProducts).orderBy(asc(koiProducts.id)),
    db.select().from(koiIngredients).orderBy(asc(koiIngredients.name)),
    db.select().from(koiRecipeItems),
  ]);

  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
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
