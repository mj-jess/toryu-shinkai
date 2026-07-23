import type { KoiSale, KoiSaleItem } from './types.js';

export function itemsRevenue(items: KoiSaleItem[]): number {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

export function itemsCost(items: KoiSaleItem[]): number {
  return items.reduce((total, item) => total + item.unitCost * item.quantity, 0);
}

export interface DishTotal {
  productId: number;
  name: string;
  quantity: number;
  revenue: number;
}

export interface SellerTotal {
  soldById: string;
  soldBy: string;
  quantity: number;
  revenue: number;
  shifts: number;
}

export interface DayTotal {
  /** ISO date (yyyy-mm-dd). */
  date: string;
  revenue: number;
  profit: number;
}

export interface SalesSummary {
  shifts: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  byDish: DishTotal[];
  bySeller: SellerTotal[];
  byDay: DayTotal[];
  topDish: DishTotal | null;
  topSeller: SellerTotal | null;
}

/** Aggregates a set of shifts — the numbers behind every summary and chart. */
export function summarizeSales(sales: KoiSale[]): SalesSummary {
  const dishes = new Map<number, DishTotal>();
  const sellers = new Map<string, SellerTotal>();
  const days = new Map<string, DayTotal>();
  let units = 0;
  let revenue = 0;
  let cost = 0;

  for (const sale of sales) {
    revenue += sale.revenue;
    cost += sale.cost;

    const day = days.get(sale.soldAt) ?? { date: sale.soldAt, revenue: 0, profit: 0 };
    day.revenue += sale.revenue;
    day.profit += sale.revenue - sale.cost;
    days.set(sale.soldAt, day);

    const seller = sellers.get(sale.soldById) ?? {
      soldById: sale.soldById,
      soldBy: sale.soldBy,
      quantity: 0,
      revenue: 0,
      shifts: 0,
    };
    seller.soldBy = sale.soldBy; // keep the most recent display name
    seller.revenue += sale.revenue;
    seller.shifts += 1;

    for (const item of sale.items) {
      units += item.quantity;
      seller.quantity += item.quantity;

      const dish = dishes.get(item.productId) ?? {
        productId: item.productId,
        name: item.productName,
        quantity: 0,
        revenue: 0,
      };
      dish.quantity += item.quantity;
      dish.revenue += item.unitPrice * item.quantity;
      dishes.set(item.productId, dish);
    }

    sellers.set(sale.soldById, seller);
  }

  const byDish = [...dishes.values()].sort((a, b) => b.quantity - a.quantity);
  const bySeller = [...sellers.values()].sort((a, b) => b.revenue - a.revenue);
  const byDay = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));

  return {
    shifts: sales.length,
    units,
    revenue,
    cost,
    profit: revenue - cost,
    byDish,
    bySeller,
    byDay,
    topDish: byDish[0] ?? null,
    topSeller: bySeller[0] ?? null,
  };
}
