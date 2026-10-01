import { describe, expect, it } from 'vitest';
import { restockCost, stockShortage } from './stock.js';

const carne = { id: 1, name: 'Carne', buyPrice: 4, minStock: 400 };

describe('stockShortage', () => {
  it('reports what is missing to reach the minimum and its cost', () => {
    expect(stockShortage(carne, 310)).toEqual({ ingredient: carne, missing: 90, cost: 360 });
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
  it('adds up every shortage', () => {
    const ovo = { id: 2, name: 'Ovo', buyPrice: 8, minStock: 100 };
    const shortages = [stockShortage(carne, 310)!, stockShortage(ovo, 90)!];
    expect(restockCost(shortages)).toBe(360 + 80);
    expect(restockCost([])).toBe(0);
  });
});
