import type { APIEmbedField } from 'discord.js';
import { gymLabels, messages } from '../messages.js';
import { formatDateBR } from './format.js';
import type { Enrollment } from './types.js';

export const EMBED_COLOR = 0x2ecc71;

/** The core enrollment data as inline embed fields (passport, name, phone, gym, date). */
export function enrollmentFields(
  enrollment: Pick<Enrollment, 'passport' | 'name' | 'phone' | 'gym' | 'enrolledAt'>,
): APIEmbedField[] {
  const labels = messages.addModal.fields;
  return [
    { name: labels.passport, value: enrollment.passport, inline: true },
    { name: labels.name, value: enrollment.name, inline: true },
    { name: labels.phone, value: enrollment.phone, inline: true },
    { name: labels.gym, value: gymLabels[enrollment.gym], inline: true },
    { name: labels.enrolledAt, value: formatDateBR(enrollment.enrolledAt), inline: true },
  ];
}

/** Two labeled lines describing an enrollment in the browser list. */
export function listEntry(enrollment: Enrollment): string {
  const status = enrollment.active
    ? messages.listView.statusActive
    : messages.listView.statusInactive;
  return [
    `**${enrollment.passport} — ${enrollment.name}**`,
    `${messages.listView.entryLine(enrollment.phone, gymLabels[enrollment.gym])} · ${status}`,
  ].join('\n');
}

/** Formats a SQLite localtime timestamp (yyyy-mm-dd hh:mm:ss) as dd/mm/yyyy. */
export function timestampToDateBR(timestamp: string | null): string {
  if (!timestamp) return '—';
  const datePart = timestamp.split(' ')[0];
  return datePart ? formatDateBR(datePart) : '—';
}
