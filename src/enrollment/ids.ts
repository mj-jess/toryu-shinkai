const NAMESPACE = 'enrollment';

/** Every interaction this feature handles, routed by custom ID. */
export type EnrollmentAction =
  | 'add'
  | 'add-modal'
  | 'browse'
  | 'due'
  | 'due-period'
  | 'prev'
  | 'next'
  | 'filter'
  | 'filter-modal'
  | 'clear-filter'
  | 'pick'
  | 'back'
  | 'view'
  | 'edit'
  | 'edit-modal'
  | 'deact'
  | 'deact-yes'
  | 'react'
  | 'renew';

export interface ParsedEnrollmentId {
  action: EnrollmentAction;
  /** Present on record-scoped actions (view/edit/deact/react). */
  passport: string;
}

export function enrollmentId(action: EnrollmentAction, passport?: string): string {
  return passport === undefined ? `${NAMESPACE}:${action}` : `${NAMESPACE}:${action}:${passport}`;
}

export function isEnrollmentId(customId: string): boolean {
  return customId.startsWith(`${NAMESPACE}:`);
}

export function parseEnrollmentId(customId: string): ParsedEnrollmentId | null {
  if (!isEnrollmentId(customId)) return null;
  const rest = customId.slice(NAMESPACE.length + 1);
  const separator = rest.indexOf(':');
  if (separator === -1) return { action: rest as EnrollmentAction, passport: '' };
  return {
    action: rest.slice(0, separator) as EnrollmentAction,
    // The passport is always the last segment and may itself contain ':'.
    passport: rest.slice(separator + 1),
  };
}
