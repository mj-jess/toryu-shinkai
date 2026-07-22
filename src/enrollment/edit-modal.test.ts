import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../database.js';
import { messages } from '../messages.js';
import { handleEditModalSubmit } from './edit-modal.js';
import { EnrollmentRepository } from './repository.js';
import { embedFieldValue, embedTitle, fakeModalInteraction, replyArg } from './test-utils.js';

interface EditValues {
  passport?: string;
  name?: string;
  phone?: string;
  gym?: string;
  enrolledAt?: string;
}

function editInteraction(values: EditValues) {
  return fakeModalInteraction({
    text: {
      passport: values.passport ?? '631',
      name: values.name ?? '',
      phone: values.phone ?? '',
      enrolledAt: values.enrolledAt ?? '',
    },
    selects: { gym: [values.gym ?? 'keep'] },
  });
}

describe('handleEditModalSubmit', () => {
  let db: Database;
  let repository: EnrollmentRepository;

  beforeEach(() => {
    db = createDatabase(':memory:');
    repository = new EnrollmentRepository(db);
    repository.insert({
      passport: '631',
      name: 'Ryoko Toryu',
      phone: '(666) 123-456',
      gym: 'both',
      enrolledAt: '2026-07-22',
      registeredBy: 'tester#0',
    });
  });

  afterEach(() => {
    db.close();
  });

  it('updates only the provided fields', async () => {
    const interaction = editInteraction({ name: 'Ryoko Renamed' });

    await handleEditModalSubmit(interaction, repository);

    expect(repository.findByPassport('631')).toMatchObject({
      name: 'Ryoko Renamed',
      phone: '(666) 123-456',
      gym: 'both',
      enrolledAt: '2026-07-22',
    });
    const reply = replyArg(interaction);
    expect(embedTitle(reply)).toBe(messages.editModal.updatedTitle);
    expect(embedFieldValue(reply, messages.editModal.changedFieldsLabel)).toBe(
      messages.addModal.fields.name,
    );
  });

  it('changes the gym when a new one is selected', async () => {
    const interaction = editInteraction({ gym: 'sandy' });

    await handleEditModalSubmit(interaction, repository);

    expect(repository.findByPassport('631')?.gym).toBe('sandy');
  });

  it('formats and validates a new phone', async () => {
    const interaction = editInteraction({ phone: '999888777' });

    await handleEditModalSubmit(interaction, repository);

    expect(repository.findByPassport('631')?.phone).toBe('(999) 888-777');
  });

  it('rejects an invalid phone without changing anything', async () => {
    const interaction = editInteraction({ phone: '12', name: 'Should Not Apply' });

    await handleEditModalSubmit(interaction, repository);

    expect(repository.findByPassport('631')?.name).toBe('Ryoko Toryu');
    expect(replyArg(interaction).content).toBe(messages.addModal.invalidPhone);
  });

  it('rejects an invalid date without changing anything', async () => {
    const interaction = editInteraction({ enrolledAt: '31/02/2026' });

    await handleEditModalSubmit(interaction, repository);

    expect(repository.findByPassport('631')?.enrolledAt).toBe('2026-07-22');
    expect(replyArg(interaction).content).toContain('Data inválida');
  });

  it('replies with an error for an unknown passport', async () => {
    const interaction = editInteraction({ passport: '999', name: 'Anyone' });

    await handleEditModalSubmit(interaction, repository);

    expect(replyArg(interaction).content).toBe(messages.editModal.notFound('999'));
  });

  it('tells the user when no field was filled', async () => {
    const interaction = editInteraction({});

    await handleEditModalSubmit(interaction, repository);

    expect(replyArg(interaction).content).toBe(messages.editModal.nothingToChange);
  });

  it('selecting the current gym does not count as a change', async () => {
    const interaction = editInteraction({ gym: 'both' });

    await handleEditModalSubmit(interaction, repository);

    expect(replyArg(interaction).content).toBe(messages.editModal.nothingToChange);
  });
});
