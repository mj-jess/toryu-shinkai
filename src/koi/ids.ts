const NAMESPACE = 'koi';

/** Every interaction the KOI feature handles, routed by custom ID. */
export type KoiAction = 'sale' | 'sale-pick' | 'sale-modal' | 'week' | 'mine';

export interface ParsedKoiId {
  action: KoiAction;
  /** Present on actions that carry state (e.g. the chosen product ids). */
  payload: string;
}

export function koiId(action: KoiAction, payload?: string): string {
  return payload === undefined ? `${NAMESPACE}:${action}` : `${NAMESPACE}:${action}:${payload}`;
}

export function isKoiId(customId: string): boolean {
  return customId.startsWith(`${NAMESPACE}:`);
}

export function parseKoiId(customId: string): ParsedKoiId | null {
  if (!isKoiId(customId)) return null;
  const rest = customId.slice(NAMESPACE.length + 1);
  const separator = rest.indexOf(':');
  if (separator === -1) return { action: rest as KoiAction, payload: '' };
  return {
    action: rest.slice(0, separator) as KoiAction,
    payload: rest.slice(separator + 1),
  };
}

/** Field id of a dish quantity inside the shift modal. */
export function quantityFieldId(productId: number): string {
  return `qty:${productId}`;
}

export function parseQuantityFieldId(fieldId: string): number | null {
  if (!fieldId.startsWith('qty:')) return null;
  const id = Number(fieldId.slice(4));
  return Number.isInteger(id) ? id : null;
}
