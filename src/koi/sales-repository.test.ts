import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../db/test-database.js';
import { loadKoiCatalog } from './catalog.js';
import { priceSaleItems } from './pricing.js';
import { KoiSalesRepository } from './sales-repository.js';
import type { KoiProductWithRecipe } from './types.js';

describe('KoiSalesRepository', () => {
  let testDb: TestDatabase;
  let repository: KoiSalesRepository;
  let catalog: KoiProductWithRecipe[];

  beforeAll(async () => {
    testDb = await createTestDatabase();
    repository = new KoiSalesRepository(testDb.db);
    catalog = await loadKoiCatalog(testDb.db);
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.resetSales();
  });

  /** Registers a shift the same way the bot and the dashboard do. */
  async function register(overrides: {
    soldAt: string;
    soldBy?: string;
    soldById?: string;
    quantities: { productId: number; quantity: number }[];
  }) {
    return repository.insert({
      soldAt: overrides.soldAt,
      soldBy: overrides.soldBy ?? 'jess',
      soldById: overrides.soldById ?? '1',
      items: priceSaleItems(catalog, overrides.quantities),
    });
  }

  function productNamed(name: string): KoiProductWithRecipe {
    const product = catalog.find((candidate) => candidate.name === name);
    if (!product) throw new Error(`missing seeded product ${name}`);
    return product;
  }

  it('stores a shift with its items, deriving revenue and cost', async () => {
    const koiRoll = productNamed('Koi Roll'); // street 600, collecting cost 170/batch of 10
    await register({ soldAt: '2026-07-20', quantities: [{ productId: koiRoll.id, quantity: 4 }] });

    const [sale] = await repository.listRecent(10);
    expect(sale).toMatchObject({ soldAt: '2026-07-20', soldBy: 'jess', revenue: 4 * 600 });
    expect(sale?.cost).toBe(4 * 17);
    expect(sale?.items).toEqual([
      {
        productId: koiRoll.id,
        productName: 'Koi Roll',
        quantity: 4,
        unitPrice: 600,
        unitCost: 17,
      },
    ]);
  });

  it('ignores dishes with zero quantity', async () => {
    const kimchi = productNamed('Vegan Kimchi');
    const koiRoll = productNamed('Koi Roll');
    await register({
      soldAt: '2026-07-20',
      quantities: [
        { productId: kimchi.id, quantity: 0 },
        { productId: koiRoll.id, quantity: 2 },
      ],
    });

    const [sale] = await repository.listRecent(10);
    expect(sale?.items).toHaveLength(1);
    expect(sale?.items[0]?.productName).toBe('Koi Roll');
  });

  it('keeps the snapshot price when the catalog changes later', async () => {
    const koiRoll = productNamed('Koi Roll');
    await register({ soldAt: '2026-07-20', quantities: [{ productId: koiRoll.id, quantity: 1 }] });

    const [before] = await repository.listRecent(1);
    expect(before?.items[0]?.unitPrice).toBe(600);

    // The dashboard raises the street price; history must not move.
    const { koiProducts } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');
    await testDb.db
      .update(koiProducts)
      .set({ streetPrice: 900 })
      .where(eq(koiProducts.id, koiRoll.id));

    const [after] = await repository.listRecent(1);
    expect(after?.items[0]?.unitPrice).toBe(600);
    expect(after?.revenue).toBe(600);
  });

  it('lists shifts inside a date range, newest first', async () => {
    const koiRoll = productNamed('Koi Roll');
    const quantities = [{ productId: koiRoll.id, quantity: 1 }];
    await register({ soldAt: '2026-07-13', quantities });
    await register({ soldAt: '2026-07-20', quantities });
    await register({ soldAt: '2026-07-27', quantities });

    const week = await repository.listBetween('2026-07-20', '2026-07-26');
    expect(week.map((sale) => sale.soldAt)).toEqual(['2026-07-20']);

    const all = await repository.listBetween('2026-07-01', '2026-07-31');
    expect(all.map((sale) => sale.soldAt)).toEqual(['2026-07-27', '2026-07-20', '2026-07-13']);
  });

  it('filters a single seller inside the range', async () => {
    const koiRoll = productNamed('Koi Roll');
    const quantities = [{ productId: koiRoll.id, quantity: 1 }];
    await register({ soldAt: '2026-07-20', soldById: 'a', soldBy: 'ana', quantities });
    await register({ soldAt: '2026-07-21', soldById: 'b', soldBy: 'bia', quantities });

    const mine = await repository.listBySeller('a', '2026-07-01', '2026-07-31');
    expect(mine).toHaveLength(1);
    expect(mine[0]?.soldBy).toBe('ana');
  });

  it('returns an empty list when there are no shifts', async () => {
    expect(await repository.listRecent(5)).toEqual([]);
    expect(await repository.listBetween('2026-01-01', '2026-12-31')).toEqual([]);
  });
});
