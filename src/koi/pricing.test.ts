import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../db/test-database.js';
import { loadKoiCatalog } from './catalog.js';
import { batchCost, batchProfit, marginPercent, productEconomics } from './pricing.js';
import type { KoiProductWithRecipe, KoiRecipeLine } from './types.js';

function line(overrides: Partial<KoiRecipeLine['ingredient']>, quantity: number): KoiRecipeLine {
  return {
    ingredient: {
      id: 1,
      name: 'Ingredient',
      buyPrice: 100,
      collectible: false,
      collectCost: 0,
      note: null,
      ...overrides,
    },
    quantity,
  };
}

describe('batchCost', () => {
  it('buying pays the store price for everything', () => {
    const recipe = [line({ buyPrice: 12, collectible: true }, 10), line({ buyPrice: 10 }, 1)];
    expect(batchCost(recipe, 'buying')).toBe(130);
  });

  it('collecting zeroes collectible ingredients but keeps the rest', () => {
    const recipe = [line({ buyPrice: 400, collectible: true }, 10), line({ buyPrice: 35 }, 1)];
    expect(batchCost(recipe, 'collecting')).toBe(35);
  });

  it('collecting still charges the collect cost (milk needs empty bottles)', () => {
    const milk = line({ buyPrice: 140, collectible: true, collectCost: 10 }, 10);
    expect(batchCost([milk], 'collecting')).toBe(100);
    expect(batchCost([milk], 'buying')).toBe(1400);
  });
});

describe('batchProfit / marginPercent', () => {
  it('computes profit for a fully sold batch', () => {
    expect(batchProfit({ batchYield: 10 }, 1130, 500)).toBe(3870);
  });

  it('rounds the margin and handles zero revenue', () => {
    expect(marginPercent(3870, 5000)).toBe(77);
    expect(marginPercent(0, 0)).toBe(0);
  });
});

describe('seeded catalog (migration data)', () => {
  let testDb: TestDatabase;
  let catalog: KoiProductWithRecipe[];

  beforeAll(async () => {
    testDb = await createTestDatabase();
    catalog = await loadKoiCatalog(testDb.db);
  });

  afterAll(async () => {
    await testDb.close();
  });

  it('seeds the five dishes with their totem prices', () => {
    expect(catalog.map((product) => [product.name, product.totemPrice])).toEqual([
      ['Vegan Kimchi', 500],
      ['Koi Roll', 600],
      ['Sundubu Kuiu', 800],
      ['Leite de Banana', 450],
      ['Caos Cream', 350],
    ]);
    expect(catalog.every((product) => product.batchYield === 10)).toBe(true);
  });

  it('matches the in-game batch costs, buying vs collecting', () => {
    const costs = Object.fromEntries(
      catalog.map((product) => [product.name, productEconomics(product)]),
    );
    expect(costs).toEqual({
      'Vegan Kimchi': { costBuying: 1130, costCollecting: 10 },
      'Koi Roll': { costBuying: 4810, costCollecting: 170 },
      'Sundubu Kuiu': { costBuying: 5225, costCollecting: 745 },
      'Leite de Banana': { costBuying: 2810, costCollecting: 810 },
      'Caos Cream': { costBuying: 2558, costCollecting: 208 },
    });
  });

  it('collecting flips the profit ranking towards the protein dishes', () => {
    const profits = catalog.map((product) => {
      const { costBuying, costCollecting } = productEconomics(product);
      return {
        name: product.name,
        buying: batchProfit(product, costBuying, product.totemPrice),
        collecting: batchProfit(product, costCollecting, product.totemPrice),
      };
    });

    const topBuying = [...profits].sort((a, b) => b.buying - a.buying)[0];
    const topCollecting = [...profits].sort((a, b) => b.collecting - a.collecting)[0];
    expect(topBuying?.name).toBe('Vegan Kimchi');
    expect(topCollecting?.name).toBe('Sundubu Kuiu');
    expect(topCollecting?.collecting).toBe(7255);
  });
});
