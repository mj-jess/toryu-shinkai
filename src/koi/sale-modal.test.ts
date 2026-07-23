import type { ModalSubmitInteraction } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { quantityFieldId } from './ids.js';
import { buildSaleModal, parseModalProductIds, parseSaleModal } from './sale-modal.js';
import type { KoiProduct } from './types.js';

function product(id: number, name: string): KoiProduct {
  return { id, name, batchYield: 10, totemPrice: 500, streetPrice: 500 };
}

/** Minimal stand-in for a modal submission carrying the given field values. */
function fakeSubmit(values: Record<string, string>): ModalSubmitInteraction {
  return {
    fields: {
      getTextInputValue: (customId: string) => values[customId] ?? '',
    },
  } as unknown as ModalSubmitInteraction;
}

describe('buildSaleModal', () => {
  it('adds one quantity field per dish, capped at five', () => {
    const products = Array.from({ length: 7 }, (_, index) => product(index + 1, `Prato ${index}`));
    const modal = buildSaleModal(products).toJSON();
    expect(modal.components).toHaveLength(5);
    expect(modal.custom_id).toBe('koi:sale-modal:1,2,3,4,5,6,7');
  });

  it('keeps the dish ids in the custom ID so the submit knows what to read', () => {
    const modal = buildSaleModal([product(3, 'Koi Roll'), product(7, 'Caos Cream')]).toJSON();
    expect(modal.custom_id).toBe('koi:sale-modal:3,7');
  });
});

describe('parseModalProductIds', () => {
  it('reads the ids back', () => {
    expect(parseModalProductIds('3,7')).toEqual([3, 7]);
  });

  it('ignores junk', () => {
    expect(parseModalProductIds('3,abc,,0,-2,5')).toEqual([3, 5]);
  });
});

describe('parseSaleModal', () => {
  it('collects the filled quantities', () => {
    const submit = fakeSubmit({ [quantityFieldId(1)]: '12', [quantityFieldId(2)]: '3' });
    expect(parseSaleModal(submit, [1, 2])).toEqual({
      quantities: [
        { productId: 1, quantity: 12 },
        { productId: 2, quantity: 3 },
      ],
      invalid: false,
    });
  });

  it('treats blank and zero as "did not sell"', () => {
    const submit = fakeSubmit({ [quantityFieldId(1)]: '', [quantityFieldId(2)]: '0' });
    expect(parseSaleModal(submit, [1, 2])).toEqual({ quantities: [], invalid: false });
  });

  it('flags values that are not whole numbers', () => {
    const submit = fakeSubmit({ [quantityFieldId(1)]: '12,5', [quantityFieldId(2)]: '4' });
    const result = parseSaleModal(submit, [1, 2]);
    expect(result.invalid).toBe(true);
    expect(result.quantities).toEqual([{ productId: 2, quantity: 4 }]);
  });

  it('flags negative values', () => {
    expect(parseSaleModal(fakeSubmit({ [quantityFieldId(1)]: '-3' }), [1]).invalid).toBe(true);
  });

  it('ignores dishes that were not part of the modal', () => {
    const submit = fakeSubmit({ [quantityFieldId(9)]: '5' });
    expect(parseSaleModal(submit, [1]).quantities).toEqual([]);
  });
});
