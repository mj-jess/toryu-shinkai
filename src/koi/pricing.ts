import type { KoiProduct, KoiProductWithRecipe, KoiRecipeLine } from './types.js';

/** Buying pays store price for everything; collecting only pays what cannot be collected. */
export type CostScenario = 'buying' | 'collecting';

/** Cost of one production run (batch) under the given scenario, in whole R$. */
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
