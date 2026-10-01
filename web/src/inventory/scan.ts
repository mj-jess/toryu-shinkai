/**
 * Pure image analysis for in-game inventory screenshots: slot grid detection,
 * icon fingerprints and the preprocessing the OCR needs. No DOM and no imports,
 * so the browser reader and the calibration script (Node) share the exact same
 * math — fingerprints generated offline match the ones computed in the page.
 */

export interface RgbaImage {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface Slot {
  x: number;
  y: number;
  width: number;
  height: number;
}

function brightness(img: RgbaImage, x: number, y: number): number {
  const i = (y * img.width + x) * 4;
  return ((img.data[i] ?? 0) + (img.data[i + 1] ?? 0) + (img.data[i + 2] ?? 0)) / 3;
}

/** Splits one axis at the dark gutters between slots. */
function splitAxis(length: number, otherLength: number, at: (i: number, j: number) => number) {
  // A gutter is darker than the slots on both sides along most of its length;
  // comparing against neighbours (not a fixed level) survives the UI's gradient.
  const reach = Math.max(4, Math.round(length / 80));
  const score = (i: number) => {
    if (i < reach || i >= length - reach) return 0;
    let darker = 0;
    for (let j = 0; j < otherLength; j++) {
      const value = at(i, j);
      if (value < at(i - reach, j) - 2 && value < at(i + reach, j) - 2) darker++;
    }
    return darker / otherLength;
  };
  const cuts: number[] = [];
  let start = -1;
  for (let i = 0; i <= length; i++) {
    const inGutter = i < length && score(i) >= 0.4;
    if (inGutter && start < 0) start = i;
    if (!inGutter && start >= 0) {
      cuts.push(Math.round((start + i - 1) / 2));
      start = -1;
    }
  }
  const bounds = [0, ...cuts, length];
  const spans: [number, number][] = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const from = bounds[i] ?? 0;
    const to = bounds[i + 1] ?? 0;
    if (to - from > length / 20) spans.push([from, to]);
  }
  return spans;
}

/** Slots of the inventory grid, row by row. */
export function detectSlots(img: RgbaImage): Slot[] {
  const columns = splitAxis(img.width, img.height, (x, y) => brightness(img, x, y));
  const rows = splitAxis(img.height, img.width, (y, x) => brightness(img, x, y));
  return rows.flatMap(([y0, y1]) =>
    columns.map(([x0, x1]) => ({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 })),
  );
}

export const FINGERPRINT_SIZE = 16;

/**
 * The slot's icon as a small RGB thumbnail (0–255 per channel), trimmed to the
 * pixels that differ from the slot background so scale and margins don't matter.
 * Null for an empty slot.
 */
export function iconFingerprint(img: RgbaImage, slot: Slot): Uint8Array | null {
  const left = slot.x + Math.round(slot.width * 0.15);
  const top = slot.y + Math.round(slot.height * 0.28);
  const right = slot.x + Math.round(slot.width * 0.85);
  const bottom = slot.y + Math.round(slot.height * 0.7);

  // Background: average of the band's border pixels.
  const bg = [0, 0, 0];
  let border = 0;
  for (let x = left; x < right; x++) {
    for (const y of [top, bottom - 1]) {
      const i = (y * img.width + x) * 4;
      for (let c = 0; c < 3; c++) bg[c]! += img.data[i + c] ?? 0;
      border++;
    }
  }
  for (let c = 0; c < 3; c++) bg[c]! /= border;

  // Bounding box of the icon: rows/columns with a few foreground pixels, so
  // compression noise and stray pixels don't stretch it.
  const columnHits = new Array<number>(right - left).fill(0);
  const rowHits = new Array<number>(bottom - top).fill(0);
  let foreground = 0;
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const i = (y * img.width + x) * 4;
      let diff = 0;
      for (let c = 0; c < 3; c++) diff += Math.abs((img.data[i + c] ?? 0) - bg[c]!);
      if (diff > 90) {
        foreground++;
        columnHits[x - left]!++;
        rowHits[y - top]!++;
      }
    }
  }
  if (foreground < (right - left) * (bottom - top) * 0.02) return null;
  const minHits = Math.max(2, Math.round((bottom - top) * 0.04));
  const first = (hits: number[]) => hits.findIndex((count) => count >= minHits);
  const last = (hits: number[]) =>
    hits.length - 1 - [...hits].reverse().findIndex((count) => count >= minHits);
  const minX = left + first(columnHits);
  const maxX = left + last(columnHits);
  const minY = top + first(rowHits);
  const maxY = top + last(rowHits);
  if (maxX <= minX || maxY <= minY) return null;

  // Area-average the bounding box down to the fingerprint grid.
  const out = new Uint8Array(FINGERPRINT_SIZE * FINGERPRINT_SIZE * 3);
  const boxW = (maxX - minX + 1) / FINGERPRINT_SIZE;
  const boxH = (maxY - minY + 1) / FINGERPRINT_SIZE;
  for (let gy = 0; gy < FINGERPRINT_SIZE; gy++) {
    for (let gx = 0; gx < FINGERPRINT_SIZE; gx++) {
      const x0 = minX + Math.floor(gx * boxW);
      const x1 = Math.max(x0 + 1, minX + Math.floor((gx + 1) * boxW));
      const y0 = minY + Math.floor(gy * boxH);
      const y1 = Math.max(y0 + 1, minY + Math.floor((gy + 1) * boxH));
      const sum = [0, 0, 0];
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * img.width + x) * 4;
          for (let c = 0; c < 3; c++) sum[c]! += img.data[i + c] ?? 0;
        }
      }
      const count = (x1 - x0) * (y1 - y0);
      for (let c = 0; c < 3; c++) out[(gy * FINGERPRINT_SIZE + gx) * 3 + c] = sum[c]! / count;
    }
  }
  return out;
}

/** Mean absolute difference between two fingerprints, 0 (same) to 1. */
export function fingerprintDistance(a: Uint8Array, b: Uint8Array): number {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
  return total / a.length / 255;
}

export function encodeFingerprint(print: Uint8Array): string {
  let binary = '';
  for (const byte of print) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeFingerprint(encoded: string): Uint8Array {
  return Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
}

export interface ReferenceIcon {
  /** Item name exactly as in the KOI catalog. */
  name: string;
  print: Uint8Array;
}

/** Above this distance an icon is treated as unknown (calibrated on real prints). */
export const ICON_MATCH_LIMIT = 0.2;
/** The best match must also beat the runner-up clearly (best / second ≤ this). */
export const ICON_MATCH_MARGIN = 0.75;

export function matchIcon(print: Uint8Array, references: ReferenceIcon[]): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  let secondDistance = Infinity;
  for (const reference of references) {
    const distance = fingerprintDistance(print, reference.print);
    if (distance < bestDistance) {
      secondDistance = bestDistance;
      bestDistance = distance;
      best = reference.name;
    } else if (distance < secondDistance) {
      secondDistance = distance;
    }
  }
  if (bestDistance > ICON_MATCH_LIMIT) return null;
  return bestDistance <= secondDistance * ICON_MATCH_MARGIN ? best : null;
}

/** Catmull-Rom weight — sharp upscaling keeps the tiny digits' strokes apart. */
function cubic(t: number): number {
  const a = Math.abs(t);
  if (a < 1) return 1.5 * a ** 3 - 2.5 * a ** 2 + 1;
  if (a < 2) return -0.5 * a ** 3 + 2.5 * a ** 2 - 4 * a + 2;
  return 0;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The slot's quantity area (top-left corner). */
export function quantityRegion(slot: Slot): Rect {
  return {
    x: slot.x,
    y: slot.y,
    width: Math.round(slot.width * 0.8),
    height: Math.round(slot.height * 0.35),
  };
}

/** The slot's label area (the name pill at the bottom). */
export function labelRegion(slot: Slot): Rect {
  const y = slot.y + Math.round(slot.height * 0.72);
  return { x: slot.x, y, width: slot.width, height: slot.y + slot.height - y };
}

/**
 * Tight box around the first line of light text inside a region — cropping to
 * the text alone (no slot border, no icon) is what makes the tiny digits legible.
 */
export function findTextLine(img: RgbaImage, region: Rect): Rect | null {
  const values: number[] = [];
  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) values.push(brightness(img, x, y));
  }
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  if (max - median < 40) return null;
  const level = median + (max - median) * 0.5;
  const lit = (x: number, y: number) =>
    (values[(y - region.y) * region.width + (x - region.x)] ?? 0) > level;

  const rowLit = (y: number) => {
    for (let x = region.x; x < region.x + region.width; x++) if (lit(x, y)) return true;
    return false;
  };
  const regionBottom = region.y + region.height;
  let top = region.y;
  while (top < regionBottom && !rowLit(top)) top++;
  if (top >= regionBottom) return null;
  let bottom = top;
  while (bottom + 1 < regionBottom && rowLit(bottom + 1)) bottom++;
  const lineHeight = bottom - top + 1;

  const columnLit = (x: number) => {
    for (let y = top; y <= bottom; y++) if (lit(x, y)) return true;
    return false;
  };
  const regionRight = region.x + region.width;
  let left = region.x;
  while (left < regionRight && !columnLit(left)) left++;
  // Extend through the word, stopping at a gap wider than the text is tall.
  let right = left;
  let gap = 0;
  for (let x = left + 1; x < regionRight; x++) {
    if (columnLit(x)) {
      right = x;
      gap = 0;
    } else if (++gap > lineHeight) {
      break;
    }
  }
  const x0 = Math.max(region.x, left - 1);
  const y0 = Math.max(region.y, top - 1);
  return {
    x: x0,
    y: y0,
    width: Math.min(regionRight, right + 2) - x0,
    height: Math.min(regionBottom, bottom + 2) - y0,
  };
}

export interface OcrImageOptions {
  /** Height the text is scaled to, in pixels. */
  textHeight: number;
  /** Turn the result into pure black/white instead of keeping anti-aliasing. */
  binarize?: boolean;
}

/**
 * Prepares a text box for Tesseract: grayscale, bicubic upscale to a fixed text
 * height, contrast stretch, inverted (dark text on white) and padded — Tesseract
 * drops glyphs that touch the image edge.
 */
export function prepareText(img: RgbaImage, rect: Rect, options: OcrImageOptions): RgbaImage {
  const scale = options.textHeight / rect.height;
  const innerW = Math.max(1, Math.round(rect.width * scale));
  const innerH = Math.max(1, Math.round(rect.height * scale));
  const pad = Math.round(options.textHeight * 0.75);
  const outW = innerW + pad * 2;
  const outH = innerH + pad * 2;
  const sample = (x: number, y: number) =>
    brightness(
      img,
      Math.min(img.width - 1, Math.max(0, rect.x + x)),
      Math.min(img.height - 1, Math.max(0, rect.y + y)),
    );

  const values = new Float32Array(innerW * innerH);
  for (let oy = 0; oy < innerH; oy++) {
    const sy = (oy + 0.5) / scale - 0.5;
    const iy = Math.floor(sy);
    for (let ox = 0; ox < innerW; ox++) {
      const sx = (ox + 0.5) / scale - 0.5;
      const ix = Math.floor(sx);
      let value = 0;
      let weights = 0;
      for (let m = -1; m <= 2; m++) {
        const wy = cubic(sy - (iy + m));
        for (let n = -1; n <= 2; n++) {
          const weight = wy * cubic(sx - (ix + n));
          value += sample(ix + n, iy + m) * weight;
          weights += weight;
        }
      }
      values[oy * innerW + ox] = value / weights;
    }
  }

  // Background (a low percentile — text covers well under half the box) maps to
  // white, the brightest stroke to black.
  const sorted = Float32Array.from(values).sort();
  const background = sorted[Math.floor(sorted.length * 0.3)] ?? 0;
  const ink = sorted[sorted.length - 1] ?? 255;
  const range = Math.max(1, ink - background);
  const out = new Uint8ClampedArray(outW * outH * 4).fill(255);
  for (let oy = 0; oy < innerH; oy++) {
    for (let ox = 0; ox < innerW; ox++) {
      let level = Math.min(1, Math.max(0, ((values[oy * innerW + ox] ?? 0) - background) / range));
      if (options.binarize) level = level > 0.5 ? 1 : 0;
      const o = ((oy + pad) * outW + ox + pad) * 4;
      out[o] = out[o + 1] = out[o + 2] = Math.round(255 * (1 - level));
    }
  }
  return { data: out, width: outW, height: outH };
}

/** Reads `2.854x` → 2854 from raw OCR text; null when there is no quantity. */
export function parseQuantityText(text: string): number | null {
  const match = /(\d[\d.,]*)\s*x/i.exec(text);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(/[.,]/g, ''));
  return Number.isSafeInteger(value) ? value : null;
}

function isSubsequence(short: string, long: string): boolean {
  if (short.length >= long.length) return false;
  let matched = 0;
  for (const char of long) if (char === short[matched]) matched++;
  return matched === short.length;
}

/**
 * Settles several OCR reads of one quantity. On these tiny digits Tesseract
 * drops characters but doesn't invent them, so a read that is a shortened
 * version of exactly one other read (10 → 410) counts as a vote for it. The
 * winner needs `minVotes` and no rival with more than one vote — otherwise
 * null, and the field is left for the user to check instead of guessing.
 */
export function resolveQuantity(reads: (number | null)[], minVotes = 3): number | null {
  const votes = new Map<number, number>();
  for (const read of reads) if (read !== null) votes.set(read, (votes.get(read) ?? 0) + 1);
  for (const value of [...votes.keys()]) {
    const longer = [...votes.keys()].filter((other) => isSubsequence(String(value), String(other)));
    const target = longer[0];
    if (longer.length === 1 && target !== undefined) {
      votes.set(target, (votes.get(target) ?? 0) + (votes.get(value) ?? 0));
      votes.delete(value);
    }
  }
  const ranked = [...votes].sort((a, b) => b[1] - a[1]);
  const [winner, runnerUp] = ranked;
  if (!winner || winner[1] < minVotes || (runnerUp?.[1] ?? 0) > 1) return null;
  return winner[0];
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length]!;
}

/**
 * Matches an OCR'd slot label (possibly truncated, e.g. "Farinha d...") to a
 * catalog name, tolerating a few misread letters. Null when nothing is close.
 */
export function matchName(text: string, names: string[]): string | null {
  const read = normalizeName(text);
  if (read.length < 3) return null;
  let best: string | null = null;
  let bestScore = Infinity;
  for (const name of names) {
    const candidate = normalizeName(name);
    // Truncated labels only show the beginning of the name.
    const comparable = candidate.slice(0, Math.max(read.length, Math.min(candidate.length, 3)));
    const score = editDistance(read, comparable) / Math.max(read.length, comparable.length);
    if (score < bestScore) {
      bestScore = score;
      best = name;
    }
  }
  return bestScore <= 0.34 ? best : null;
}
