import type { KoiProduct, KoiProductWithRecipe, KoiRecipeLine, KoiSaleItem } from './types.js';

/** Buying pays store price for everything; collecting only pays what cannot be collected. */
export type CostScenario = 'buying' | 'collecting';

/** Cost of one production run (batch) under the given scenario. */
export function batchCost(recipe: KoiRecipeLine[], scenario: CostScenario): number {
  return recipe.reduce((total, line) => {
    const unitCost =
      scenario === 'collecting' && line.ingredient.collectible
        ? line.ingredient.collectCost
        : line.ingredient.buyPrice;
    return total + unitCost * line.quantity;
  }, 0);
}

export interface ProductEconomics {
  costBuying: number;
  costCollecting: number;
}

export function productEconomics(product: KoiProductWithRecipe): ProductEconomics {
  return {
    costBuying: batchCost(product.recipe, 'buying'),
    costCollecting: batchCost(product.recipe, 'collecting'),
  };
}

/** Profit of one batch fully sold at the given unit price. */
export function batchProfit(
  product: Pick<KoiProduct, 'batchYield'>,
  cost: number,
  unitPrice: number,
): number {
  return unitPrice * product.batchYield - cost;
}

/** Share of revenue kept as profit, rounded percent (0 when there is no revenue). */
export function marginPercent(profit: number, revenue: number): number {
  if (revenue <= 0) return 0;
  return Math.round((profit / revenue) * 100);
}

/** Ingredient cost of a single unit — the batch cost split across the batch. */
export function unitCost(product: KoiProductWithRecipe, scenario: CostScenario): number {
  if (product.batchYield <= 0) return 0;
  return Math.round(batchCost(product.recipe, scenario) / product.batchYield);
}

/**
 * Prices a shift from the current catalog: the street price becomes the unit
 * price and the collecting cost per unit becomes the unit cost. Both are
 * snapshotted onto the sale so later catalog edits never rewrite history.
 */
export function priceSaleItems(
  products: KoiProductWithRecipe[],
  quantities: { productId: number; quantity: number }[],
): KoiSaleItem[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return quantities
    .filter((entry) => entry.quantity > 0)
    .flatMap((entry) => {
      const product = byId.get(entry.productId);
      if (!product) return [];
      return [
        {
          productId: product.id,
          productName: product.name,
          quantity: entry.quantity,
          unitPrice: product.streetPrice,
          unitCost: unitCost(product, 'collecting'),
        },
      ];
    });
}
