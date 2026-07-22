import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../db/test-database.js';
import { messages } from '../messages.js';
import { handleEnrollmentInteraction, type BrowseContext } from './browse-handlers.js';
import { BrowseSessions } from './browse-session.js';
import { getTodayISO } from './format.js';
import { EnrollmentRepository } from './repository.js';
import {
  browseState,
  embedFieldValue,
  embedTitle,
  fakeAuditLog,
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
  let testDb: TestDatabase;
  let ctx: BrowseContext;
  let audit: ReturnType<typeof fakeAuditLog>;

  beforeAll(async () => {
    testDb = await createTestDatabase();
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    audit = fakeAuditLog();
    ctx = {
      repository: new EnrollmentRepository(testDb.db),
      sessions: new BrowseSessions(),
      audit,
    };
    await ctx.repository.insert(buildInput());
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
    expect((await ctx.repository.findByPassport('631'))?.active).toBe(true);
  });

  it('deactivates on confirmation and shows the updated card', async () => {
    const interaction = fakeButtonInteraction('enrollment:deact-yes:631');

    await handleEnrollmentInteraction(interaction, ctx);

    expect(await ctx.repository.findByPassport('631')).toMatchObject({
      active: false,
      deactivatedBy: 'tester#0',
    });
    const payload = updateArg(interaction);
    expect(replyEmbed(payload)?.data.description).toBe(messages.detailView.deactivatedNote);
    expect(embedFieldValue(payload, messages.detailView.statusLabel)).toBe(
      messages.detailView.statusInactive,
    );
    expect(audit.events).toMatchObject([
      { action: 'deactivated', actor: '<@42>', enrollment: { passport: '631', active: false } },
    ]);
  });

  it('reactivates keeping the data', async () => {
    await ctx.repository.deactivate('631', 'admin#1');

    const interaction = fakeButtonInteraction('enrollment:react:631');
    await handleEnrollmentInteraction(interaction, ctx);

    expect(await ctx.repository.findByPassport('631')).toMatchObject({
      name: 'Ryoko Toryu',
      active: true,
      deactivatedBy: null,
    });
    expect(replyEmbed(updateArg(interaction))?.data.description).toBe(
      messages.detailView.reactivatedNote,
    );
    expect(audit.events).toMatchObject([
      { action: 'reactivated', enrollment: { passport: '631', active: true } },
    ]);
  });

  it('renews an enrollment, updating the date and auditing before → after', async () => {
    await ctx.repository.update({ passport: '631', enrolledAt: '2026-05-01' });

    const interaction = fakeButtonInteraction('enrollment:renew:631');
    await handleEnrollmentInteraction(interaction, ctx);

    expect((await ctx.repository.findByPassport('631'))?.enrolledAt).toBe(getTodayISO());
    expect(replyEmbed(updateArg(interaction))?.data.description).toBe(
      messages.detailView.renewedNote,
    );
    expect(audit.events).toMatchObject([
      {
        action: 'renewed',
        enrollment: { passport: '631' },
        changes: [{ label: messages.addModal.fields.enrolledAt }],
      },
    ]);
  });

  it('does not renew twice on the same day', async () => {
    await ctx.repository.update({ passport: '631', enrolledAt: getTodayISO() });

    const interaction = fakeButtonInteraction('enrollment:renew:631');
    await handleEnrollmentInteraction(interaction, ctx);

    expect(replyEmbed(updateArg(interaction))?.data.description).toBe(
      messages.detailView.renewedAlreadyNote,
    );
    expect(audit.events).toEqual([]);
  });

  it('opens the renewals list on the default period', async () => {
    await ctx.repository.update({ passport: '631', enrolledAt: '2026-01-01' });

    const interaction = fakeButtonInteraction('enrollment:due');
    await handleEnrollmentInteraction(interaction, ctx);

    const payload = replyArg(interaction);
    expect(embedTitle(payload)).toBe(messages.dueView.title);
    expect(replyEmbed(payload)?.data.description).toContain('631 — Ryoko Toryu');
    expect(ctx.sessions.get('user-1')).toMatchObject({ view: 'due', period: '1m', page: 0 });
  });

  it('switches the renewal period via the toggle', async () => {
    await ctx.repository.update({ passport: '631', enrolledAt: '2026-07-05' });
    ctx.sessions.set('user-1', browseState({ view: 'due', period: '1m' }));

    const interaction = fakeButtonInteraction('enrollment:due-period:2w');
    await handleEnrollmentInteraction(interaction, ctx);

    expect(ctx.sessions.get('user-1')).toMatchObject({ view: 'due', period: '2w' });
    expect(replyEmbed(updateArg(interaction))?.data.footer?.text).toContain(
      messages.dueView.periodNote(messages.dueView.periodLabels['2w']),
    );
  });

  it('goes back from the card to the due list when it was the active view', async () => {
    await ctx.repository.update({ passport: '631', enrolledAt: '2026-01-01' });
    ctx.sessions.set('user-1', browseState({ view: 'due', period: '1m' }));

    const interaction = fakeButtonInteraction('enrollment:back');
    await handleEnrollmentInteraction(interaction, ctx);

    expect(embedTitle(updateArg(interaction))).toBe(messages.dueView.title);
  });

  it('goes back from the card to the list keeping the session state', async () => {
    ctx.sessions.set('user-1', browseState({ page: 0, filter: 'ryo' }));

    const interaction = fakeButtonInteraction('enrollment:back');
    await handleEnrollmentInteraction(interaction, ctx);

    const payload = updateArg(interaction);
    expect(embedTitle(payload)).toBe(messages.listView.title);
    expect(replyEmbed(payload)?.data.footer?.text).toContain(messages.listView.filterNote('ryo'));
  });

  it('applies a filter from the filter modal', async () => {
    await ctx.repository.insert(buildInput({ passport: '99', name: 'John Doe' }));

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
    ctx.sessions.set('user-1', browseState({ page: 0, filter: 'john' }));

    const interaction = fakeButtonInteraction('enrollment:clear-filter');
    await handleEnrollmentInteraction(interaction, ctx);

    expect(ctx.sessions.get('user-1').filter).toBe('');
    expect(replyEmbed(updateArg(interaction))?.data.description).toContain('Ryoko');
  });

  it('paginates forward and backward through the session', async () => {
    for (let i = 0; i < 12; i += 1) {
      await ctx.repository.insert(
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
