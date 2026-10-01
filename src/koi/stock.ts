import type { KoiIngredient } from './types.js';

type StockIngredient = Pick<
  KoiIngredient,
  'id' | 'name' | 'buyPrice' | 'minStock' | 'collectible' | 'collectCost'
>;

/** An ingredient below its minimum stock, and what bringing it back up costs. */
export interface StockShortage {
  ingredient: StockIngredient;
  /** Units missing to reach the minimum. */
  missing: number;
  /** Buying the missing units at the store price. */
  cost: number;
  /** Collecting them instead (e.g. milk still needs bottles); 0 when not collectible. */
  collectCost: number;
}

/** Shortage for one ingredient at a given quantity, or null when it is at/above its minimum. */
export function stockShortage(ingredient: StockIngredient, quantity: number): StockShortage | null {
  if (ingredient.minStock <= 0 || quantity >= ingredient.minStock) return null;
  const missing = ingredient.minStock - quantity;
  return {
    ingredient,
    missing,
    cost: missing * ingredient.buyPrice,
    collectCost: ingredient.collectible ? missing * ingredient.collectCost : 0,
  };
}

/**
 * Money needed to bring every shortage back to its minimum. Non-collectible
 * ingredients are always bought; a collectible one is bought only when `buys`
 * says so — otherwise it is collected and only its collecting cost counts.
 */
export function restockCost(
  shortages: StockShortage[],
  buys: (shortage: StockShortage) => boolean = () => true,
): number {
  return shortages.reduce(
    (total, shortage) =>
      total +
      (!shortage.ingredient.collectible || buys(shortage) ? shortage.cost : shortage.collectCost),
    0,
  );
}
