import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, serial, text, unique } from 'drizzle-orm/pg-core';

/**
 * Dates are stored as ISO strings (`yyyy-mm-dd`) and timestamps as
 * `yyyy-mm-dd hh:mm:ss`, matching what the app already speaks — only the
 * database layer changed in the SQLite → Postgres migration.
 */
export const enrollments = pgTable(
  'enrollments',
  {
    id: serial('id').primaryKey(),
    passport: text('passport').notNull().unique(),
    name: text('name').notNull(),
    phone: text('phone').notNull().unique(),
    gym: text('gym', { enum: ['sandy', 'vinewood', 'both'] }).notNull(),
    enrolledAt: text('enrolled_at').notNull(),
    active: boolean('active').notNull().default(true),
    registeredBy: text('registered_by'),
    deactivatedBy: text('deactivated_by'),
    deactivatedAt: text('deactivated_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`to_char(now(), 'YYYY-MM-DD HH24:MI:SS')`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`to_char(now(), 'YYYY-MM-DD HH24:MI:SS')`),
  },
  (table) => [check('enrollments_gym_check', sql`${table.gym} IN ('sandy', 'vinewood', 'both')`)],
);

/** Key-value store for bot configuration (e.g. the audit log channel). */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/**
 * KOI restaurant catalog. Prices mirror the in-game values as editable
 * defaults — when the game changes, the system is updated, not the code.
 * All prices are whole units of the in-game currency ($).
 */
export const koiIngredients = pgTable('koi_ingredients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  /** Store (Arkham Store) price per unit. */
  buyPrice: integer('buy_price').notNull(),
  /** Whether members can collect it in-game instead of buying. */
  collectible: boolean('collectible').notNull().default(false),
  /** Cost per unit even when collected (e.g. milk needs an empty bottle). */
  collectCost: integer('collect_cost').notNull().default(0),
  note: text('note'),
});

export const koiProducts = pgTable('koi_products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  /** Units produced per production run. */
  batchYield: integer('batch_yield').notNull().default(10),
  /** Totem (vending point) price per unit. */
  totemPrice: integer('totem_price').notNull(),
  /** Street price per unit — free-form and expected to change often. */
  streetPrice: integer('street_price').notNull(),
});

/**
 * One street-sale shift, registered from Discord: what a member sold and how
 * much it brought in. Prices and costs are snapshots — editing the catalog
 * later must never rewrite history.
 */
export const koiSales = pgTable('koi_sales', {
  id: serial('id').primaryKey(),
  /** Shift date, ISO (yyyy-mm-dd). */
  soldAt: text('sold_at').notNull(),
  /** Discord tag shown in summaries. */
  soldBy: text('sold_by').notNull(),
  /** Discord user id — the stable key for rankings. */
  soldById: text('sold_by_id').notNull(),
  /** Total collected, in whole in-game currency. */
  revenue: integer('revenue').notNull(),
  /** Estimated ingredient cost (collecting scenario), same unit. */
  cost: integer('cost').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`to_char(now(), 'YYYY-MM-DD HH24:MI:SS')`),
});

export const koiSaleItems = pgTable('koi_sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id')
    .notNull()
    .references(() => koiSales.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => koiProducts.id),
  quantity: integer('quantity').notNull(),
  /** Street price charged per unit at the time of the sale. */
  unitPrice: integer('unit_price').notNull(),
  /** Estimated cost per unit at the time of the sale. */
  unitCost: integer('unit_cost').notNull(),
});

/** Ingredient quantities consumed by one production run of a product. */
export const koiRecipeItems = pgTable(
  'koi_recipe_items',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => koiProducts.id),
    ingredientId: integer('ingredient_id')
      .notNull()
      .references(() => koiIngredients.id),
    quantity: integer('quantity').notNull(),
  },
  (table) => [unique().on(table.productId, table.ingredientId)],
);
