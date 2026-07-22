import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../database.js';
import { messages } from '../messages.js';
import { buildEditModal, handleEditModalSubmit } from './edit-modal.js';
import { EnrollmentRepository } from './repository.js';
import {
  embedTitle,
  fakeModalInteraction,
  modalField,
  replyArg,
  replyEmbed,
  updateArg,
} from './test-utils.js';

function editInteraction(
  overrides: Partial<Record<'name' | 'phone' | 'enrolledAt', string>> = {},
  gym = 'both',
) {
  return fakeModalInteraction({
    customId: 'enrollment:edit-modal:631',
    text: {
      name: 'Ryoko Toryu',
      phone: '(666) 123-456',
      enrolledAt: '22/07/2026',
      ...overrides,
    },
    selects: { gym: [gym] },
  });
}

describe('buildEditModal', () => {
  it('pre-fills every field with the current data', () => {
    const modal = buildEditModal({
      id: 1,
      passport: '631',
      name: 'Ryoko Toryu',
      phone: '(666) 123-456',
      gym: 'sandy',
      enrolledAt: '2026-07-22',
      active: true,
      registeredBy: 'tester#0',
      deactivatedBy: null,
      deactivatedAt: null,
      createdAt: '',
      updatedAt: '',
    }).toJSON();

    expect(modal.custom_id).toBe('enrollment:edit-modal:631');
    expect(modal.title).toBe(messages.editModal.title('631'));
    expect(modalField(modal, 'name')?.value).toBe('Ryoko Toryu');
    expect(modalField(modal, 'phone')?.value).toBe('(666) 123-456');
    expect(modalField(modal, 'enrolledAt')?.value).toBe('22/07/2026');
    expect(modalField(modal, 'gym')?.options?.find((o) => o.default)?.value).toBe('sandy');
  });
});

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

  it('applies changes and refreshes the record card in place', async () => {
    const interaction = editInteraction({ name: 'Ryoko Renamed' });

    await handleEditModalSubmit(interaction, '631', repository);

    expect(repository.findByPassport('631')?.name).toBe('Ryoko Renamed');
    const payload = updateArg(interaction);
    expect(embedTitle(payload)).toBe(messages.detailView.title('631', 'Ryoko Renamed'));
    expect(replyEmbed(payload)?.data.description).toContain(
      `${messages.editModal.changedFieldsLabel}: ${messages.addModal.fields.name}`,
    );
  });

  it('changes the gym via the select', async () => {
    const interaction = editInteraction({}, 'vinewood');

    await handleEditModalSubmit(interaction, '631', repository);

    expect(repository.findByPassport('631')?.gym).toBe('vinewood');
  });

  it('reports when nothing changed', async () => {
    const interaction = editInteraction();

    await handleEditModalSubmit(interaction, '631', repository);

    expect(replyEmbed(updateArg(interaction))?.data.description).toBe(
      messages.editModal.nothingToChange,
    );
  });

  it('rejects an invalid phone without changing anything', async () => {
    const interaction = editInteraction({ phone: '12', name: 'Should Not Apply' });

    await handleEditModalSubmit(interaction, '631', repository);

    expect(repository.findByPassport('631')?.name).toBe('Ryoko Toryu');
    expect(replyArg(interaction).content).toBe(messages.addModal.invalidPhone);
  });

  it('rejects a phone that belongs to another enrollment', async () => {
    repository.insert({
      passport: '99',
      name: 'John Doe',
      phone: '(111) 222-333',
      gym: 'sandy',
      enrolledAt: '2026-07-22',
      registeredBy: 'tester#0',
    });

    const interaction = editInteraction({ phone: '111222333' });
    await handleEditModalSubmit(interaction, '631', repository);

    expect(repository.findByPassport('631')?.phone).toBe('(666) 123-456');
    expect(replyArg(interaction).content).toBe(
      messages.addModal.phoneInUse('(111) 222-333', '99', 'John Doe'),
    );
  });

  it('keeping the own phone is not a conflict', async () => {
    const interaction = editInteraction({ name: 'Renamed' });

    await handleEditModalSubmit(interaction, '631', repository);

    expect(repository.findByPassport('631')?.name).toBe('Renamed');
  });

  it('rejects an invalid date without changing anything', async () => {
    const interaction = editInteraction({ enrolledAt: '31/02/2026' });

    await handleEditModalSubmit(interaction, '631', repository);

    expect(repository.findByPassport('631')?.enrolledAt).toBe('2026-07-22');
    expect(replyArg(interaction).content).toContain('Data inválida');
  });

  it('replies with an error for an unknown passport', async () => {
    const interaction = editInteraction();

    await handleEditModalSubmit(interaction, '999', repository);

    expect(replyArg(interaction).content).toBe(messages.detailView.notFound);
  });
});
