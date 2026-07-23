/** Formats a phone number as `(999) 999-999`. Returns null when invalid. */
export function formatPhoneNumber(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 9) return null;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Formats a date as ISO (yyyy-mm-dd), local time. */
export function toISO(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Today's date in Brazilian format (dd/mm/yyyy). */
export function getTodayBR(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${now.getFullYear()}`;
}

/** Today's date in ISO (yyyy-mm-dd), local time. */
export function getTodayISO(): string {
  return toISO(new Date());
}

/** Current timestamp as `yyyy-mm-dd hh:mm:ss`, local time (audit columns). */
export function nowTimestamp(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${toISO(now)} ${hours}:${minutes}:${seconds}`;
}

/** The ISO date (yyyy-mm-dd) `days` days before today, local time. */
export function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toISO(date);
}

/** Whole days elapsed from an ISO date (yyyy-mm-dd) until today, local time. */
export function daysSince(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  const then = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
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
