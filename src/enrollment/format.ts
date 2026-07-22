/** Formats a phone number as `(999) 999-999`. Returns null when invalid. */
export function formatPhoneNumber(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 9) return null;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Today's date in Brazilian format (dd/mm/yyyy). */
export function getTodayBR(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${now.getFullYear()}`;
}

/** Parses a Brazilian date (dd/mm/yyyy) into ISO (yyyy-mm-dd). Returns null when invalid. */
export function parseDateBR(input: string): string | null {
  const match = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Formats an ISO date (yyyy-mm-dd) as Brazilian (dd/mm/yyyy). */
export function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
