import { toISO } from '../enrollment/format.js';

export interface DateRange {
  fromIso: string;
  toIso: string;
}

/** The Monday→Sunday week containing `reference`, local time. */
export function weekRange(reference: Date): DateRange {
  const daysFromMonday = (reference.getDay() + 6) % 7;
  const monday = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate() - daysFromMonday,
  );
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { fromIso: toISO(monday), toIso: toISO(sunday) };
}

/** The week before the one containing `reference` — what a Monday post covers. */
export function previousWeekRange(reference: Date): DateRange {
  const lastWeek = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - 7);
  return weekRange(lastWeek);
}

/** Stable key of a week (its Monday), so the weekly post happens only once. */
export function weekKey(range: DateRange): string {
  return range.fromIso;
}
