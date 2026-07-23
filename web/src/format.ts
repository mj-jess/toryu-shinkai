import { formatDateBR } from '@bot/enrollment/format';

/** Formats a `yyyy-mm-dd hh:mm:ss` timestamp as `dd/mm/yyyy às hh:mm`. */
export function formatTimestampBR(timestamp: string): string {
  const [date, time] = timestamp.split(' ');
  if (!date || !time) return timestamp;
  return `${formatDateBR(date)} às ${time.slice(0, 5)}`;
}

/** Formats whole amounts in the in-game currency ($ 5.225). */
export function formatMoney(value: number): string {
  return `$ ${value.toLocaleString('pt-BR')}`;
}
