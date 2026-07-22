import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../database.js';
import { messages } from '../messages.js';
import { handleDeactivateModalSubmit } from './deactivate-modal.js';
import { EnrollmentRepository } from './repository.js';
import { embedTitle, fakeModalInteraction, replyArg } from './test-utils.js';

function deactivateInteraction(passport: string) {
  return fakeModalInteraction({ text: { passport } });
}

describe('handleDeactivateModalSubmit', () => {
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

  it('deactivates an active enrollment, recording who did it', async () => {
    const interaction = deactivateInteraction('631');

    await handleDeactivateModalSubmit(interaction, repository);

    expect(repository.findByPassport('631')).toMatchObject({
      active: false,
      deactivatedBy: 'tester#0',
    });
    expect(embedTitle(replyArg(interaction))).toBe(messages.deactivateModal.deactivatedTitle);
  });

  it('warns when the enrollment is already inactive', async () => {
    repository.deactivate('631', 'admin#1');

    const interaction = deactivateInteraction('631');
    await handleDeactivateModalSubmit(interaction, repository);

    expect(replyArg(interaction).content).toBe(
      messages.deactivateModal.alreadyInactive('Ryoko Toryu'),
    );
    // The original audit info is preserved.
    expect(repository.findByPassport('631')?.deactivatedBy).toBe('admin#1');
  });

  it('replies with an error for an unknown passport', async () => {
    const interaction = deactivateInteraction('999');

    await handleDeactivateModalSubmit(interaction, repository);

    expect(replyArg(interaction).content).toBe(messages.deactivateModal.notFound('999'));
  });
});
