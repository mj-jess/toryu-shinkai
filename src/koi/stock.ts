import type { KoiIngredient } from './types.js';

/** An ingredient below its minimum stock, and what bringing it back up costs. */
export interface StockShortage {
  ingredient: Pick<KoiIngredient, 'id' | 'name' | 'buyPrice' | 'minStock'>;
  /** Units missing to reach the minimum. */
  missing: number;
  /** Buying the missing units at the store price. */
  cost: number;
}

/** Shortage for one ingredient at a given quantity, or null when it is at/above its minimum. */
export function stockShortage(
  ingredient: Pick<KoiIngredient, 'id' | 'name' | 'buyPrice' | 'minStock'>,
  quantity: number,
): StockShortage | null {
  if (ingredient.minStock <= 0 || quantity >= ingredient.minStock) return null;
  const missing = ingredient.minStock - quantity;
  return { ingredient, missing, cost: missing * ingredient.buyPrice };
}

/** Total store cost to bring every shortage back to its minimum. */
export function restockCost(shortages: StockShortage[]): number {
  return shortages.reduce((total, shortage) => total + shortage.cost, 0);
}
