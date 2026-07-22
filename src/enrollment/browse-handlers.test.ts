import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../database.js';
import { messages } from '../messages.js';
import { handleEnrollmentInteraction, type BrowseContext } from './browse-handlers.js';
import { BrowseSessions } from './browse-session.js';
import { EnrollmentRepository } from './repository.js';
import {
  embedFieldValue,
  embedTitle,
  fakeButtonInteraction,
  fakeModalInteraction,
  fakeSelectInteraction,
  replyArg,
  replyEmbed,
  shownModal,
  updateArg,
} from './test-utils.js';
import type { EnrollmentInput } from './types.js';

let phoneSeed = 500;

function buildInput(overrides: Partial<EnrollmentInput> = {}): EnrollmentInput {
  phoneSeed += 1;
  return {
    passport: '631',
    name: 'Ryoko Toryu',
    phone: `(${phoneSeed}) 123-456`,
    gym: 'both',
    enrolledAt: '2026-07-22',
    registeredBy: 'tester#0',
    ...overrides,
  };
}

describe('handleEnrollmentInteraction', () => {
  let db: Database;
  let ctx: BrowseContext;

  beforeEach(() => {
    db = createDatabase(':memory:');
    ctx = { repository: new EnrollmentRepository(db), sessions: new BrowseSessions() };
    ctx.repository.insert(buildInput());
  });

  afterEach(() => {
    db.close();
  });

  it('ignores custom IDs outside the enrollment namespace', async () => {
    const interaction = fakeButtonInteraction('other:thing');
    expect(await handleEnrollmentInteraction(interaction, ctx)).toBe(false);
  });

  it('opens the add modal from the panel', async () => {
    const interaction = fakeButtonInteraction('enrollment:add');

    await handleEnrollmentInteraction(interaction, ctx);

    expect(shownModal(interaction)?.custom_id).toBe('enrollment:add-modal');
  });

  it('opens the browser as an ephemeral list', async () => {
    const interaction = fakeButtonInteraction('enrollment:browse');

    await handleEnrollmentInteraction(interaction, ctx);

    const payload = replyArg(interaction);
    expect(embedTitle(payload)).toBe(messages.listView.title);
    expect(replyEmbed(payload)?.data.description).toContain('631 — Ryoko Toryu');
    expect(replyEmbed(payload)?.data.description).toContain('Telefone:');
  });

  it('opens the record card when a record is picked', async () => {
    const interaction = fakeSelectInteraction('enrollment:pick', ['631']);

    await handleEnrollmentInteraction(interaction, ctx);

    const payload = updateArg(interaction);
    expect(embedTitle(payload)).toBe('631 — Ryoko Toryu');
    expect(embedFieldValue(payload, messages.detailView.statusLabel)).toBe(
      messages.detailView.statusActive,
    );
  });

  it('opens the pre-filled edit modal from the record card', async () => {
    const interaction = fakeButtonInteraction('enrollment:edit:631');

    await handleEnrollmentInteraction(interaction, ctx);

    const modal = shownModal(interaction);
    expect(modal?.custom_id).toBe('enrollment:edit-modal:631');
  });

  it('asks for confirmation before deactivating', async () => {
    const interaction = fakeButtonInteraction('enrollment:deact:631');

    await handleEnrollmentInteraction(interaction, ctx);

    expect(replyEmbed(updateArg(interaction))?.data.description).toContain('inativar');
    expect(ctx.repository.findByPassport('631')?.active).toBe(true);
  });

  it('deactivates on confirmation and shows the updated card', async () => {
    const interaction = fakeButtonInteraction('enrollment:deact-yes:631');

    await handleEnrollmentInteraction(interaction, ctx);

    expect(ctx.repository.findByPassport('631')).toMatchObject({
      active: false,
      deactivatedBy: 'tester#0',
    });
    const payload = updateArg(interaction);
    expect(replyEmbed(payload)?.data.description).toBe(messages.detailView.deactivatedNote);
    expect(embedFieldValue(payload, messages.detailView.statusLabel)).toBe(
      messages.detailView.statusInactive,
    );
  });

  it('reactivates keeping the data', async () => {
    ctx.repository.deactivate('631', 'admin#1');

    const interaction = fakeButtonInteraction('enrollment:react:631');
    await handleEnrollmentInteraction(interaction, ctx);

    expect(ctx.repository.findByPassport('631')).toMatchObject({
      name: 'Ryoko Toryu',
      active: true,
      deactivatedBy: null,
    });
    expect(replyEmbed(updateArg(interaction))?.data.description).toBe(
      messages.detailView.reactivatedNote,
    );
  });

  it('goes back from the card to the list keeping the session state', async () => {
    ctx.sessions.set('user-1', { page: 0, filter: 'ryo' });

    const interaction = fakeButtonInteraction('enrollment:back');
    await handleEnrollmentInteraction(interaction, ctx);

    const payload = updateArg(interaction);
    expect(embedTitle(payload)).toBe(messages.listView.title);
    expect(replyEmbed(payload)?.data.footer?.text).toContain(messages.listView.filterNote('ryo'));
  });

  it('applies a filter from the filter modal', async () => {
    ctx.repository.insert(buildInput({ passport: '99', name: 'John Doe' }));

    const interaction = fakeModalInteraction({
      customId: 'enrollment:filter-modal',
      text: { term: 'john' },
    });
    await handleEnrollmentInteraction(interaction, ctx);

    const payload = updateArg(interaction);
    expect(replyEmbed(payload)?.data.description).toContain('John Doe');
    expect(replyEmbed(payload)?.data.description).not.toContain('Ryoko');
    expect(ctx.sessions.get('user-1').filter).toBe('john');
  });

  it('shows a friendly empty state for a filter with no matches', async () => {
    const interaction = fakeModalInteraction({
      customId: 'enrollment:filter-modal',
      text: { term: 'nobody' },
    });
    await handleEnrollmentInteraction(interaction, ctx);

    expect(replyEmbed(updateArg(interaction))?.data.description).toBe(
      messages.listView.emptyFiltered('nobody'),
    );
  });

  it('clears the filter', async () => {
    ctx.sessions.set('user-1', { page: 0, filter: 'john' });

    const interaction = fakeButtonInteraction('enrollment:clear-filter');
    await handleEnrollmentInteraction(interaction, ctx);

    expect(ctx.sessions.get('user-1').filter).toBe('');
    expect(replyEmbed(updateArg(interaction))?.data.description).toContain('Ryoko');
  });

  it('paginates forward and backward through the session', async () => {
    for (let i = 0; i < 12; i += 1) {
      ctx.repository.insert(
        buildInput({ passport: `p${i}`, name: `Person ${String(i).padStart(2, '0')}` }),
      );
    }

    const next = fakeButtonInteraction('enrollment:next');
    await handleEnrollmentInteraction(next, ctx);
    expect(ctx.sessions.get('user-1').page).toBe(1);
    expect(replyEmbed(updateArg(next))?.data.footer?.text).toContain('Página 2/2');

    const prev = fakeButtonInteraction('enrollment:prev');
    await handleEnrollmentInteraction(prev, ctx);
    expect(ctx.sessions.get('user-1').page).toBe(0);
  });
});
