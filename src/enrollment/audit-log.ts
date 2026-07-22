import { EmbedBuilder, type Client } from 'discord.js';
import { gymLabels, messages } from '../messages.js';
import type { SettingsRepository } from '../settings.js';
import { formatDateBR } from './format.js';
import type { Enrollment } from './types.js';

export const AUDIT_SETUP_COMMAND_NAME = 'academia-log-setup';
export const AUDIT_CHANNEL_SETTING_KEY = 'enrollment.audit_channel_id';

export type AuditAction = 'created' | 'updated' | 'deactivated' | 'reactivated' | 'renewed';

/** One edited field, with display values ready for the log message. */
export interface AuditChange {
  label: string;
  before: string;
  after: string;
}

export interface AuditEvent {
  action: AuditAction;
  /** The record as it stands after the action. */
  enrollment: Enrollment;
  /** Discord mention of the admin who performed the action. */
  actor: string;
  /** Present on 'updated' events. */
  changes?: AuditChange[];
}

/** What handlers depend on; the production implementation posts to the configured channel. */
export interface AuditLog {
  /** Resolves to the posted message URL, or null when no log was sent. */
  send(event: AuditEvent): Promise<string | null>;
}

const ACTION_COLORS: Record<AuditAction, number> = {
  created: 0x2ecc71,
  updated: 0xf1c40f,
  deactivated: 0xe74c3c,
  reactivated: 0x3498db,
  renewed: 0x1abc9c,
};

// Twemoji PNGs (💪 ✏️ 💤 🔄 💰) as author icons — a real image aligns with the
// text, unlike an emoji inside a title, whose rendering Discord controls.
const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72';
const ACTION_ICONS: Record<AuditAction, string> = {
  created: `${TWEMOJI_BASE}/1f4aa.png`,
  updated: `${TWEMOJI_BASE}/270f.png`,
  deactivated: `${TWEMOJI_BASE}/1f4a4.png`,
  reactivated: `${TWEMOJI_BASE}/1f504.png`,
  renewed: `${TWEMOJI_BASE}/1f4b0.png`,
};

/**
 * One `Chave: valor` line per field, stacked like a CRUD show page.
 * Changed fields (on 'updated' events) render as `antes → depois`.
 */
export function buildAuditEmbed(event: AuditEvent): EmbedBuilder {
  const { action, enrollment, actor, changes = [] } = event;
  const labels = messages.addModal.fields;

  const display = new Map<string, string>([
    [labels.passport, enrollment.passport],
    [labels.name, enrollment.name],
    [labels.phone, enrollment.phone],
    [labels.gym, gymLabels[enrollment.gym]],
    [labels.enrolledAt, formatDateBR(enrollment.enrolledAt)],
  ]);
  for (const change of changes) {
    display.set(change.label, messages.auditLog.change(change.before, change.after));
  }
  display.set(messages.auditLog.byLabel, actor);

  const lines = [...display.entries()].map(([label, value]) => `**${label}:** ${value}`);

  return new EmbedBuilder()
    .setColor(ACTION_COLORS[action])
    .setAuthor({ name: messages.auditLog.titles[action], iconURL: ACTION_ICONS[action] })
    .setDescription(lines.join('\n'))
    .setTimestamp(new Date());
}

/** Posts audit events to the channel registered via /academia-log-setup. */
export class EnrollmentAuditLog implements AuditLog {
  constructor(
    private readonly client: Client,
    private readonly settings: SettingsRepository,
  ) {}

  /** Audit failures never break the enrollment flow — they only reach the console. */
  async send(event: AuditEvent): Promise<string | null> {
    try {
      const channelId = this.settings.get(AUDIT_CHANNEL_SETTING_KEY);
      if (!channelId) return null;
      const channel = await this.client.channels.fetch(channelId);
      if (!channel?.isSendable()) return null;
      const message = await channel.send({ embeds: [buildAuditEmbed(event)] });
      return message.url;
    } catch (error) {
      console.error('Failed to send enrollment audit log:', error);
      return null;
    }
  }
}
