import { formatDateBR } from '@bot/enrollment/format';

/** Formats a `yyyy-mm-dd hh:mm:ss` timestamp as `dd/mm/yyyy às hh:mm`. */
export function formatTimestampBR(timestamp: string): string {
  const [date, time] = timestamp.split(' ');
  if (!date || !time) return timestamp;
  return `${formatDateBR(date)} às ${time.slice(0, 5)}`;
}

/** Formats whole R$ amounts with pt-BR thousand separators (R$ 5.225). */
export function formatMoney(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR')}`;
}
