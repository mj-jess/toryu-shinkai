import { describe, expect, it } from 'vitest';
import {
  decodeFingerprint,
  detectSlots,
  encodeFingerprint,
  iconFingerprint,
  matchIcon,
  matchName,
  parseQuantityText,
  resolveQuantity,
  type RgbaImage,
} from './scan';

/** Synthetic inventory: dark gutters around lighter slots, optional colored squares as icons. */
function inventory(columns: number, rows: number, icons: Record<number, [number, number, number]>) {
  const slot = 80;
  const gutter = 6;
  const width = columns * slot + (columns - 1) * gutter;
  const height = rows * slot + (rows - 1) * gutter;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inGutter = x % (slot + gutter) >= slot || y % (slot + gutter) >= slot;
      const i = (y * width + x) * 4;
      const level = inGutter ? 20 : 40;
      data[i] = data[i + 1] = level;
      data[i + 2] = level + 15;
      data[i + 3] = 255;
    }
  }
  const image: RgbaImage = { data, width, height };
  for (const [index, color] of Object.entries(icons)) {
    const column = Number(index) % columns;
    const row = Math.floor(Number(index) / columns);
    const x0 = column * (slot + gutter) + 25;
    const y0 = row * (slot + gutter) + 28;
    for (let y = y0; y < y0 + 26; y++) {
      for (let x = x0; x < x0 + 30; x++) {
        const i = (y * width + x) * 4;
        [data[i], data[i + 1], data[i + 2]] = color;
      }
    }
  }
  return image;
}

describe('detectSlots', () => {
  it('finds every slot of the grid, row by row', () => {
    const slots = detectSlots(inventory(5, 3, {}));
    expect(slots).toHaveLength(15);
    expect(slots[0]).toMatchObject({ x: 0, y: 0 });
    expect(slots[5]!.y).toBeGreaterThan(70);
  });
});

describe('icon fingerprints', () => {
  const image = inventory(3, 1, { 0: [230, 60, 40], 1: [40, 200, 90] });
  const slots = detectSlots(image);

  it('treats a slot without an icon as empty', () => {
    expect(iconFingerprint(image, slots[2]!)).toBeNull();
  });

  it('matches icons against the references and rejects unknown ones', () => {
    const red = iconFingerprint(image, slots[0]!)!;
    const green = iconFingerprint(image, slots[1]!)!;
    const references = [{ name: 'Tomate', print: red }];
    expect(matchIcon(red, references)).toBe('Tomate');
    expect(matchIcon(green, references)).toBeNull();
  });

  it('survives the base64 round trip used by the reference file', () => {
    const print = iconFingerprint(image, slots[0]!)!;
    expect(decodeFingerprint(encodeFingerprint(print))).toEqual(print);
  });
});

describe('parseQuantityText', () => {
  it('reads plain and thousands-separated quantities', () => {
    expect(parseQuantityText('728x')).toBe(728);
    expect(parseQuantityText(' 2.854x\n')).toBe(2854);
    expect(parseQuantityText('5x')).toBe(5);
  });

  it('needs the trailing x', () => {
    expect(parseQuantityText('728')).toBeNull();
    expect(parseQuantityText('')).toBeNull();
  });
});

describe('resolveQuantity', () => {
  it('accepts a value enough reads agree on', () => {
    expect(resolveQuantity([150, 150, 150])).toBe(150);
  });

  it('counts a read with dropped digits as a vote for the full value', () => {
    expect(resolveQuantity([10, 410, 410])).toBe(410);
    expect(resolveQuantity([86, null, 816, 86, null, 816])).toBe(816);
  });

  it('gives up when the reads disagree', () => {
    expect(resolveQuantity([30, 10, 10])).toBeNull();
    expect(resolveQuantity([442, 842, 642])).toBeNull();
    expect(resolveQuantity([null, null, 5])).toBeNull();
  });

  it('gives up when a rival value has real support', () => {
    expect(resolveQuantity([310, 510, 310, 310, 510, 310])).toBeNull();
  });
});

describe('matchName', () => {
  const names = ['Garrafão de Água', 'Farinha de Trigo', 'Carne', 'Leite', 'Leite de Banana'];

  it('matches truncated labels', () => {
    expect(matchName('Garrafão...', names)).toBe('Garrafão de Água');
    expect(matchName('Farinha d...', names)).toBe('Farinha de Trigo');
  });

  it('tolerates a misread letter', () => {
    expect(matchName('Corne', names)).toBe('Carne');
  });

  it('prefers the exact name over a longer one with the same start', () => {
    expect(matchName('Leite', names)).toBe('Leite');
  });

  it('rejects noise', () => {
    expect(matchName('ao', names)).toBeNull();
    expect(matchName('xyzw', names)).toBeNull();
  });
});
