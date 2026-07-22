import { formatDateBR } from '@bot/enrollment/format';

/** Formats a `yyyy-mm-dd hh:mm:ss` timestamp as `dd/mm/yyyy às hh:mm`. */
export function formatTimestampBR(timestamp: string): string {
  const [date, time] = timestamp.split(' ');
  if (!date || !time) return timestamp;
  return `${formatDateBR(date)} às ${time.slice(0, 5)}`;
}
