import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../database.js';
import { messages } from '../messages.js';
import { EnrollmentRepository } from './repository.js';
import { handleSearchModalSubmit } from './search-modal.js';
import { fakeModalInteraction, replyArg, replyEmbed } from './test-utils.js';
import type { EnrollmentInput } from './types.js';

function buildInput(overrides: Partial<EnrollmentInput> = {}): EnrollmentInput {
  return {
    passport: '631',
    name: 'Ryoko Toryu',
    phone: '(666) 123-456',
    gym: 'both',
    enrolledAt: '2026-07-22',
    registeredBy: 'tester#0',
    ...overrides,
  };
}

function searchInteraction(term: string) {
  return fakeModalInteraction({ text: { term } });
}

describe('handleSearchModalSubmit', () => {
  let db: Database;
  let repository: EnrollmentRepository;

  beforeEach(() => {
    db = createDatabase(':memory:');
    repository = new EnrollmentRepository(db);
    repository.insert(buildInput());
    repository.insert(buildInput({ passport: '99', name: 'John Doe' }));
    repository.deactivate('99', 'admin#1');
  });

  afterEach(() => {
    db.close();
  });

  it('finds enrollments by partial name and shows status', async () => {
    const interaction = searchInteraction('ryoko');

    await handleSearchModalSubmit(interaction, repository);

    const embed = replyEmbed(replyArg(interaction));
    expect(embed?.data.title).toBe(messages.searchModal.resultsTitle);
    expect(embed?.data.fields).toHaveLength(1);
    expect(embed?.data.fields?.[0]?.name).toBe('631 — Ryoko Toryu');
    expect(embed?.data.fields?.[0]?.value).toContain(messages.searchModal.statusActive);
  });

  it('marks inactive enrollments in the results', async () => {
    const interaction = searchInteraction('99');

    await handleSearchModalSubmit(interaction, repository);

    const embed = replyEmbed(replyArg(interaction));
    expect(embed?.data.fields?.[0]?.value).toContain('💤 Inativa');
  });

  it('lists the most recent enrollments for *', async () => {
    const interaction = searchInteraction('*');

    await handleSearchModalSubmit(interaction, repository);

    const embed = replyEmbed(replyArg(interaction));
    expect(embed?.data.title).toBe(messages.searchModal.recentTitle);
    expect(embed?.data.fields).toHaveLength(2);
  });

  it('shows active/inactive totals in the footer', async () => {
    const interaction = searchInteraction('*');

    await handleSearchModalSubmit(interaction, repository);

    const embed = replyEmbed(replyArg(interaction));
    expect(embed?.data.footer?.text).toBe(messages.searchModal.totalsFooter(1, 1));
  });

  it('replies with a friendly message when nothing matches', async () => {
    const interaction = searchInteraction('nobody');

    await handleSearchModalSubmit(interaction, repository);

    expect(replyArg(interaction).content).toBe(messages.searchModal.noResults('nobody'));
  });
});
