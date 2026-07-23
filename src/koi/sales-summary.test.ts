import { describe, expect, it } from 'vitest';
import { itemsCost, itemsRevenue, summarizeSales } from './sales-summary.js';
import type { KoiSale, KoiSaleItem } from './types.js';

function item(overrides: Partial<KoiSaleItem> = {}): KoiSaleItem {
  return {
    productId: 1,
    productName: 'Koi Roll',
    quantity: 2,
    unitPrice: 600,
    unitCost: 17,
    ...overrides,
  };
}

function sale(overrides: Partial<KoiSale> = {}): KoiSale {
  const items = overrides.items ?? [item()];
  return {
    id: 1,
    soldAt: '2026-07-20',
    soldBy: 'jess',
    soldById: '1',
    revenue: itemsRevenue(items),
    cost: itemsCost(items),
    createdAt: '2026-07-20 21:00:00',
    ...overrides,
    items,
  };
}

describe('itemsRevenue / itemsCost', () => {
  it('multiplies each line by its quantity', () => {
    const items = [item({ quantity: 3 }), item({ productId: 2, quantity: 1, unitPrice: 500 })];
    expect(itemsRevenue(items)).toBe(3 * 600 + 500);
    expect(itemsCost(items)).toBe(3 * 17 + 17);
  });

  it('is zero for an empty shift', () => {
    expect(itemsRevenue([])).toBe(0);
    expect(itemsCost([])).toBe(0);
  });
});

describe('summarizeSales', () => {
  it('returns zeroes with no shifts', () => {
    const summary = summarizeSales([]);
    expect(summary).toMatchObject({ shifts: 0, units: 0, revenue: 0, profit: 0 });
    expect(summary.topDish).toBeNull();
    expect(summary.topSeller).toBeNull();
  });

  it('totals revenue, cost and profit across shifts', () => {
    const summary = summarizeSales([
      sale({ id: 1, items: [item({ quantity: 10 })] }),
      sale({ id: 2, items: [item({ quantity: 5 })] }),
    ]);
    expect(summary.shifts).toBe(2);
    expect(summary.units).toBe(15);
    expect(summary.revenue).toBe(15 * 600);
    expect(summary.cost).toBe(15 * 17);
    expect(summary.profit).toBe(15 * 600 - 15 * 17);
  });

  it('ranks dishes by quantity sold', () => {
    const summary = summarizeSales([
      sale({
        id: 1,
        items: [
          item({ productId: 1, productName: 'Koi Roll', quantity: 4 }),
          item({ productId: 2, productName: 'Caos Cream', quantity: 9, unitPrice: 350 }),
        ],
      }),
    ]);
    expect(summary.byDish.map((dish) => dish.name)).toEqual(['Caos Cream', 'Koi Roll']);
    expect(summary.topDish).toMatchObject({ name: 'Caos Cream', quantity: 9, revenue: 9 * 350 });
  });

  it('ranks sellers by revenue and counts their shifts', () => {
    const summary = summarizeSales([
      sale({ id: 1, soldById: 'a', soldBy: 'ana', items: [item({ quantity: 2 })] }),
      sale({ id: 2, soldById: 'b', soldBy: 'bia', items: [item({ quantity: 9 })] }),
      sale({ id: 3, soldById: 'a', soldBy: 'ana', items: [item({ quantity: 3 })] }),
    ]);
    expect(summary.bySeller.map((seller) => seller.soldBy)).toEqual(['bia', 'ana']);
    expect(summary.topSeller).toMatchObject({ soldBy: 'bia', shifts: 1, quantity: 9 });
    expect(summary.bySeller[1]).toMatchObject({ soldBy: 'ana', shifts: 2, quantity: 5 });
  });

  it('groups by day, oldest first', () => {
    const summary = summarizeSales([
      sale({ id: 1, soldAt: '2026-07-22', items: [item({ quantity: 1 })] }),
      sale({ id: 2, soldAt: '2026-07-20', items: [item({ quantity: 2 })] }),
      sale({ id: 3, soldAt: '2026-07-20', items: [item({ quantity: 3 })] }),
    ]);
    expect(summary.byDay.map((day) => day.date)).toEqual(['2026-07-20', '2026-07-22']);
    expect(summary.byDay[0]?.revenue).toBe(5 * 600);
    expect(summary.byDay[0]?.profit).toBe(5 * 600 - 5 * 17);
  });

  it('keeps the most recent display name of a seller', () => {
    const summary = summarizeSales([
      sale({ id: 1, soldById: 'a', soldBy: 'nome antigo' }),
      sale({ id: 2, soldById: 'a', soldBy: 'nome novo' }),
    ]);
    expect(summary.bySeller[0]?.soldBy).toBe('nome novo');
  });
});
