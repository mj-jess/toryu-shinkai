import { describe, expect, it } from 'vitest';
import { restockCost, stockShortage } from './stock.js';

const carne = {
  id: 1,
  name: 'Carne',
  buyPrice: 4,
  minStock: 400,
  collectible: false,
  collectCost: 0,
};
const leite = {
  id: 2,
  name: 'Leite',
  buyPrice: 30,
  minStock: 100,
  collectible: true,
  collectCost: 10,
};

describe('stockShortage', () => {
  it('reports what is missing to reach the minimum and its cost', () => {
    expect(stockShortage(carne, 310)).toEqual({
      ingredient: carne,
      missing: 90,
      cost: 360,
      collectCost: 0,
    });
  });

  it('also prices collecting for collectible ingredients', () => {
    expect(stockShortage(leite, 80)).toMatchObject({ missing: 20, cost: 600, collectCost: 200 });
  });

  it('is null at or above the minimum', () => {
    expect(stockShortage(carne, 400)).toBeNull();
    expect(stockShortage(carne, 500)).toBeNull();
  });

  it('is null when no minimum is configured', () => {
    expect(stockShortage({ ...carne, minStock: 0 }, 0)).toBeNull();
  });
});

describe('restockCost', () => {
  const shortages = [stockShortage(carne, 310)!, stockShortage(leite, 80)!];

  it('buys everything by default', () => {
    expect(restockCost(shortages)).toBe(360 + 600);
  });

  it('counts only the collecting cost for collectibles that are not bought', () => {
    expect(restockCost(shortages, () => false)).toBe(360 + 200);
  });

  it('always buys non-collectible ingredients', () => {
    expect(restockCost([stockShortage(carne, 310)!], () => false)).toBe(360);
    expect(restockCost([])).toBe(0);
  });
});
