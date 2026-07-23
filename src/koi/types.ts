export interface KoiIngredient {
  id: number;
  name: string;
  /** Store price per unit, in whole R$. */
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
  /** Totem price per unit, in whole R$. */
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
