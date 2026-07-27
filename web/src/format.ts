import { formatDateBR } from '@bot/enrollment/format';

const BRAZIL_TZ = 'America/Sao_Paulo';

/** Formats a `yyyy-mm-dd hh:mm:ss` timestamp as `dd/mm/yyyy às hh:mm`. */
export function formatTimestampBR(timestamp: string): string {
  const [date, time] = timestamp.split(' ');
  if (!date || !time) return timestamp;
  return `${formatDateBR(date)} às ${time.slice(0, 5)}`;
}

/**
 * Today as ISO (yyyy-mm-dd) in the family's timezone. The bot/VM runs in
 * America/Sao_Paulo but Vercel is UTC, so pin the zone instead of using the
 * server clock — otherwise late-night registrations would land on the next day.
 */
export function todayIsoBR(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Current `yyyy-mm-dd hh:mm:ss` in the family's timezone (audit columns). */
export function nowTimestampBR(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

/**
 * Whole days from an ISO date (yyyy-mm-dd) until `todayIso`. Uses UTC math so
 * the result is deterministic and DST-safe — both ends come from ISO strings,
 * with `todayIso` produced in the family's timezone by `todayIsoBR()`.
 */
export function daysBetween(fromIso: string, todayIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = todayIso.split('-').map(Number);
  const from = Date.UTC(fy ?? 0, (fm ?? 1) - 1, fd ?? 1);
  const to = Date.UTC(ty ?? 0, (tm ?? 1) - 1, td ?? 1);
  return Math.round((to - from) / 86_400_000);
}

/** Formats whole amounts in the in-game currency ($ 5.225). */
export function formatMoney(value: number): string {
  return `$ ${value.toLocaleString('pt-BR')}`;
}
