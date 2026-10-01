import type { Worker } from 'tesseract.js';
import { ICON_REFERENCES } from './icon-references';
import {
  decodeFingerprint,
  detectSlots,
  findTextLine,
  iconFingerprint,
  labelRegion,
  matchIcon,
  matchName,
  parseQuantityText,
  prepareText,
  quantityRegion,
  resolveQuantity,
  type OcrImageOptions,
  type ReferenceIcon,
  type RgbaImage,
} from './scan';

/**
 * Reads an inventory screenshot entirely in the browser: the item comes from its
 * icon (fingerprints in icon-references.ts) and the quantity from Tesseract. The
 * image never leaves the page — nothing is uploaded or stored.
 */

export interface InventoryItemReading {
  ingredientId: number;
  /** Null when the item was found but its quantity couldn't be read reliably. */
  quantity: number | null;
}

export interface InventoryReading {
  /** Slots detected in the image — 0 means it doesn't look like the inventory. */
  slots: number;
  items: InventoryItemReading[];
}

/** Two passes of three renderings each; the second only runs when the first disagrees. */
const READ_PASSES: { pageSegMode: string; sizes: OcrImageOptions[] }[] = [6, 7].map((mode) => ({
  pageSegMode: String(mode),
  // Binarized renderings read the game's rounded digits best (picked on real prints).
  sizes: [
    { textHeight: 26, binarize: true },
    { textHeight: 32, binarize: true },
    { textHeight: 64, binarize: true },
  ],
}));

async function decodeImage(file: Blob): Promise<RgbaImage> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas 2D is not available');
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  return { data, width, height };
}

function toCanvas(image: RgbaImage): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas
    .getContext('2d')
    ?.putImageData(
      new ImageData(new Uint8ClampedArray(image.data), image.width, image.height),
      0,
      0,
    );
  return canvas;
}

export async function readInventory(
  file: Blob,
  ingredients: { id: number; name: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<InventoryReading> {
  const image = await decodeImage(file);
  const slots = detectSlots(image).filter((slot) => iconFingerprint(image, slot) !== null);
  if (slots.length === 0) return { slots: 0, items: [] };

  const references: ReferenceIcon[] = ICON_REFERENCES.map((reference) => ({
    name: reference.name,
    print: decodeFingerprint(reference.print),
  }));
  const knownNames = [
    ...new Set([...references.map((r) => r.name), ...ingredients.map((i) => i.name)]),
  ];
  const ingredientByName = new Map(
    ingredients.map((ingredient) => [ingredient.name, ingredient.id]),
  );

  const { createWorker } = await import('tesseract.js');
  const digits = await createWorker('eng');
  await digits.setParameters({ tessedit_char_whitelist: '0123456789.,x' });
  let labels: Worker | null = null;

  const totals = new Map<number, number | null>();
  try {
    for (const [index, slot] of slots.entries()) {
      onProgress?.(index, slots.length);
      const print = iconFingerprint(image, slot);
      let name = print ? matchIcon(print, references) : null;

      // Unknown icon (a new item, or a heavily compressed print): read its label instead.
      if (!name) {
        const labelBox = findTextLine(image, labelRegion(slot));
        if (labelBox) {
          labels ??= await createWorker('por');
          const { data } = await labels.recognize(
            toCanvas(prepareText(image, labelBox, { textHeight: 40 })),
          );
          name = matchName(data.text, knownNames);
        }
      }
      const ingredientId = name ? ingredientByName.get(name) : undefined;
      if (ingredientId === undefined) continue; // not an ingredient (e.g. a dish) or unrecognized

      const quantityBox = findTextLine(image, quantityRegion(slot));
      let quantity: number | null = null;
      if (quantityBox) {
        const reads: (number | null)[] = [];
        for (const pass of READ_PASSES) {
          await digits.setParameters({ tessedit_pageseg_mode: pass.pageSegMode as never });
          for (const size of pass.sizes) {
            const { data } = await digits.recognize(
              toCanvas(prepareText(image, quantityBox, size)),
            );
            reads.push(parseQuantityText(data.text));
          }
          quantity = resolveQuantity(reads);
          if (quantity !== null) break;
        }
      }

      // The same item split across slots adds up; one unreadable slot spoils the sum.
      const previous = totals.get(ingredientId);
      totals.set(
        ingredientId,
        previous === undefined
          ? quantity
          : previous === null || quantity === null
            ? null
            : previous + quantity,
      );
    }
    onProgress?.(slots.length, slots.length);
  } finally {
    await digits.terminate();
    await labels?.terminate();
  }

  return {
    slots: slots.length,
    items: [...totals].map(([ingredientId, quantity]) => ({ ingredientId, quantity })),
  };
}
