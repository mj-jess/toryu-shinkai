export interface KoiIngredient {
  id: number;
  name: string;
  /** Store price per unit, in whole in-game currency. */
  buyPrice: number;
  /** Whether members can collect it in-game instead of buying. */
  collectible: boolean;
  /** Cost per unit even when collected (e.g. milk needs an empty bottle). */
  collectCost: number;
  note: string | null;
}

export interface KoiProduct {
  id: number;
  name: string;
  /** Units produced per production run. */
  batchYield: number;
  /** Totem price per unit, in whole in-game currency. */
  totemPrice: number;
  /** Street price per unit — free-form and expected to change often. */
  streetPrice: number;
}

export interface KoiRecipeLine {
  ingredient: KoiIngredient;
  /** Ingredient units consumed per production run. */
  quantity: number;
}

export interface KoiProductWithRecipe extends KoiProduct {
  recipe: KoiRecipeLine[];
}

/** One line of a street-sale shift: how many of a dish, at which snapshot prices. */
export interface KoiSaleItem {
  productId: number;
  productName: string;
  quantity: number;
  /** Street price charged per unit at the time of the sale. */
  unitPrice: number;
  /** Estimated cost per unit at the time of the sale. */
  unitCost: number;
}

export interface KoiSale {
  id: number;
  /** Shift date, ISO (yyyy-mm-dd). */
  soldAt: string;
  soldBy: string;
  soldById: string;
  revenue: number;
  cost: number;
  createdAt: string;
  items: KoiSaleItem[];
}

/** What a shift registration carries before it is priced and stored. */
export interface KoiSaleInput {
  soldAt: string;
  soldBy: string;
  soldById: string;
  /** Quantities by product id; zero/absent means "not sold". */
  quantities: { productId: number; quantity: number }[];
}
