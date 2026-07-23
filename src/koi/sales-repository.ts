import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import type { Database } from '../database.js';
import { koiProducts, koiSaleItems, koiSales } from '../db/schema.js';
import { itemsCost, itemsRevenue } from './sales-summary.js';
import type { KoiSale, KoiSaleItem } from './types.js';

interface SaleRow {
  id: number;
  soldAt: string;
  soldBy: string;
  soldById: string;
  revenue: number;
  cost: number;
  createdAt: string;
}

export class KoiSalesRepository {
  constructor(private readonly db: Database) {}

  /**
   * Stores one shift with its priced items. Revenue and cost are derived from
   * the snapshots, so a sale always adds up to its own lines.
   */
  async insert(sale: {
    soldAt: string;
    soldBy: string;
    soldById: string;
    items: KoiSaleItem[];
  }): Promise<number> {
    const [row] = await this.db
      .insert(koiSales)
      .values({
        soldAt: sale.soldAt,
        soldBy: sale.soldBy,
        soldById: sale.soldById,
        revenue: itemsRevenue(sale.items),
        cost: itemsCost(sale.items),
      })
      .returning({ id: koiSales.id });

    const saleId = row?.id;
    if (saleId === undefined) throw new Error('Failed to insert KOI sale');

    await this.db.insert(koiSaleItems).values(
      sale.items.map((item) => ({
        saleId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
      })),
    );
    return saleId;
  }

  /** Shifts with `soldAt` inside the inclusive ISO range, newest first. */
  async listBetween(fromIso: string, toIso: string): Promise<KoiSale[]> {
    return this.withItems(
      await this.db
        .select()
        .from(koiSales)
        .where(and(gte(koiSales.soldAt, fromIso), lte(koiSales.soldAt, toIso)))
        .orderBy(desc(koiSales.soldAt), desc(koiSales.id)),
    );
  }

  /** The most recent shifts, newest first. */
  async listRecent(limit: number): Promise<KoiSale[]> {
    return this.withItems(
      await this.db
        .select()
        .from(koiSales)
        .orderBy(desc(koiSales.soldAt), desc(koiSales.id))
        .limit(limit),
    );
  }

  /** A single member's shifts inside the inclusive ISO range. */
  async listBySeller(soldById: string, fromIso: string, toIso: string): Promise<KoiSale[]> {
    return this.withItems(
      await this.db
        .select()
        .from(koiSales)
        .where(
          and(
            eq(koiSales.soldById, soldById),
            gte(koiSales.soldAt, fromIso),
            lte(koiSales.soldAt, toIso),
          ),
        )
        .orderBy(desc(koiSales.soldAt), desc(koiSales.id)),
    );
  }

  /** Attaches the items of the given sales, naming each product. */
  private async withItems(sales: SaleRow[]): Promise<KoiSale[]> {
    if (sales.length === 0) return [];

    const rows = await this.db
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
}
