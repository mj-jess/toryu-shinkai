import type { Database } from 'better-sqlite3';
import type { Client } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDatabase } from '../database.js';
import { messages } from '../messages.js';
import { SettingsRepository } from '../settings.js';
import {
  AUDIT_CHANNEL_SETTING_KEY,
  buildAuditEmbed,
  EnrollmentAuditLog,
  type AuditEvent,
} from './audit-log.js';
import type { Enrollment } from './types.js';

function buildEnrollment(overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    id: 1,
    passport: '631',
    name: 'Ryoko Toryu',
    phone: '(666) 123-456',
    gym: 'both',
    enrolledAt: '2026-07-22',
    active: true,
    registeredBy: 'tester#0',
    deactivatedBy: null,
    deactivatedAt: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('buildAuditEmbed', () => {
  it('stacks the full record as one labeled line per field', () => {
    const embed = buildAuditEmbed({
      action: 'created',
      enrollment: buildEnrollment(),
      actor: '<@42>',
    });

    expect(embed.data.author?.name).toBe(messages.auditLog.titles.created);
    expect(embed.data.author?.icon_url).toContain('1f4aa.png');
    expect(embed.data.description).toBe(
      [
        '**Passaporte:** 631',
        '**Nome:** Ryoko Toryu',
        '**Telefone:** (666) 123-456',
        '**Academia:** As duas',
        '**Matriculado em:** 22/07/2026',
        '**Por:** <@42>',
      ].join('\n'),
    );
  });

  it('renders changed fields as before → after inside the snapshot on updated events', () => {
    const embed = buildAuditEmbed({
      action: 'updated',
      enrollment: buildEnrollment({ name: 'Ryoko Renamed' }),
      actor: '<@42>',
      changes: [
        { label: messages.addModal.fields.name, before: 'Ryoko Toryu', after: 'Ryoko Renamed' },
      ],
    });

    expect(embed.data.author?.name).toBe(messages.auditLog.titles.updated);
    expect(embed.data.description).toContain('**Nome:** Ryoko Toryu → Ryoko Renamed');
    // Unchanged fields keep their current value in the snapshot.
    expect(embed.data.description).toContain('**Telefone:** (666) 123-456');
    expect(embed.data.description).toContain('**Por:** <@42>');
  });
});

describe('EnrollmentAuditLog', () => {
  const event: AuditEvent = {
    action: 'created',
    enrollment: buildEnrollment(),
    actor: '<@42>',
  };

  let db: Database;
  let settings: SettingsRepository;

  beforeEach(() => {
    db = createDatabase(':memory:');
    settings = new SettingsRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  function fakeClient(fetch: ReturnType<typeof vi.fn>): Client {
    return { channels: { fetch } } as unknown as Client;
  }

  it('does nothing when no channel is configured', async () => {
    const fetch = vi.fn();

    const url = await new EnrollmentAuditLog(fakeClient(fetch), settings).send(event);

    expect(url).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts the embed to the configured channel and returns the message URL', async () => {
    settings.set(AUDIT_CHANNEL_SETTING_KEY, 'channel-1');
    const send = vi.fn().mockResolvedValue({ url: 'https://discord.com/channels/1/2/3' });
    const fetch = vi.fn().mockResolvedValue({ isSendable: () => true, send });

    const url = await new EnrollmentAuditLog(fakeClient(fetch), settings).send(event);

    expect(fetch).toHaveBeenCalledWith('channel-1');
    const [payload] = send.mock.calls[0] ?? [];
    expect(payload?.embeds?.[0]?.data.author?.name).toBe(messages.auditLog.titles.created);
    expect(url).toBe('https://discord.com/channels/1/2/3');
  });

  it('skips channels the bot cannot send to', async () => {
    settings.set(AUDIT_CHANNEL_SETTING_KEY, 'channel-1');
    const send = vi.fn();
    const fetch = vi.fn().mockResolvedValue({ isSendable: () => false, send });

    const url = await new EnrollmentAuditLog(fakeClient(fetch), settings).send(event);

    expect(url).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it('never throws when the channel fetch fails', async () => {
    settings.set(AUDIT_CHANNEL_SETTING_KEY, 'channel-1');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetch = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(
      new EnrollmentAuditLog(fakeClient(fetch), settings).send(event),
    ).resolves.toBeNull();

    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
