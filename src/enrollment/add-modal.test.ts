import type { Database } from 'better-sqlite3';
import {
  EmbedBuilder,
  type InteractionReplyOptions,
  type ModalSubmitInteraction,
} from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createDatabase } from '../database.js';
import { messages } from '../messages.js';
import { handleAddModalSubmit } from './add-modal.js';
import { EnrollmentRepository } from './repository.js';

interface FormValues {
  passport: string;
  name: string;
  phone: string;
  gym: string;
  enrolledAt: string;
}

function buildFormValues(overrides: Partial<FormValues> = {}): FormValues {
  return {
    passport: '12345',
    name: 'John Doe',
    phone: '123456789',
    gym: 'both',
    enrolledAt: '22/07/2026',
    ...overrides,
  };
}

function fakeInteraction(values: FormValues): ModalSubmitInteraction {
  const textFields: Record<string, string> = {
    passport: values.passport,
    name: values.name,
    phone: values.phone,
    enrolledAt: values.enrolledAt,
  };

  return {
    fields: {
      getTextInputValue: (id: string) => textFields[id] ?? '',
      getStringSelectValues: () => [values.gym],
    },
    user: { tag: 'tester#0', toString: () => '<@42>' },
    reply: vi.fn().mockResolvedValue(undefined),
  } as unknown as ModalSubmitInteraction;
}

function replyArg(interaction: ModalSubmitInteraction): InteractionReplyOptions {
  return (interaction.reply as Mock).mock.calls[0]?.[0] as InteractionReplyOptions;
}

function embedTitle(reply: InteractionReplyOptions): string | undefined {
  const [embed] = reply.embeds ?? [];
  return embed instanceof EmbedBuilder ? embed.data.title : undefined;
}

describe('handleAddModalSubmit', () => {
  let db: Database;
  let repository: EnrollmentRepository;

  beforeEach(() => {
    db = createDatabase(':memory:');
    repository = new EnrollmentRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates an enrollment from valid input', async () => {
    const interaction = fakeInteraction(buildFormValues());

    await handleAddModalSubmit(interaction, repository);

    expect(repository.findByPassport('12345')).toMatchObject({
      name: 'John Doe',
      phone: '(123) 456-789',
      gym: 'both',
      enrolledAt: '2026-07-22',
      active: true,
      registeredBy: 'tester#0',
    });
    expect(embedTitle(replyArg(interaction))).toBe(messages.addModal.createdTitle);
  });

  it('trims passport and name', async () => {
    const interaction = fakeInteraction(buildFormValues({ passport: ' 12345 ', name: ' John ' }));

    await handleAddModalSubmit(interaction, repository);

    expect(repository.findByPassport('12345')?.name).toBe('John');
  });

  it('rejects an invalid phone without saving', async () => {
    const interaction = fakeInteraction(buildFormValues({ phone: '123' }));

    await handleAddModalSubmit(interaction, repository);

    expect(repository.findByPassport('12345')).toBeUndefined();
    expect(replyArg(interaction).content).toBe(messages.addModal.invalidPhone);
  });

  it('rejects an invalid date without saving', async () => {
    const interaction = fakeInteraction(buildFormValues({ enrolledAt: '31/02/2026' }));

    await handleAddModalSubmit(interaction, repository);

    expect(repository.findByPassport('12345')).toBeUndefined();
    expect(replyArg(interaction).content).toContain('Data inválida');
  });

  it('warns when the passport already has an active enrollment', async () => {
    await handleAddModalSubmit(fakeInteraction(buildFormValues()), repository);

    const second = fakeInteraction(buildFormValues({ name: 'Someone Else' }));
    await handleAddModalSubmit(second, repository);

    expect(repository.findByPassport('12345')?.name).toBe('John Doe');
    expect(replyArg(second).content).toContain('já tem matrícula ativa');
  });

  it('reactivates an inactive enrollment with the new data', async () => {
    await handleAddModalSubmit(fakeInteraction(buildFormValues()), repository);
    repository.deactivate('12345');

    const again = fakeInteraction(buildFormValues({ name: 'John Returns', gym: 'sandy' }));
    await handleAddModalSubmit(again, repository);

    expect(repository.findByPassport('12345')).toMatchObject({
      name: 'John Returns',
      gym: 'sandy',
      active: true,
    });
    expect(embedTitle(replyArg(again))).toBe(messages.addModal.reactivatedTitle);
  });
});
