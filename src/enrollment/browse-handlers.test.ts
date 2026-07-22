import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../database.js';
import { messages } from '../messages.js';
import { handleEnrollmentInteraction, type BrowseContext } from './browse-handlers.js';
import { BrowseSessions } from './browse-session.js';
import { formatDateBR, getTodayISO, isoDaysAgo } from './format.js';
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
  let db: Database;
  let ctx: BrowseContext;
  let audit: ReturnType<typeof fakeAuditLog>;

  beforeEach(() => {
    db = createDatabase(':memory:');
    audit = fakeAuditLog();
    ctx = { repository: new EnrollmentRepository(db), sessions: new BrowseSessions(), audit };
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
    expect(audit.events).toMatchObject([
      { action: 'deactivated', actor: '<@42>', enrollment: { passport: '631', active: false } },
    ]);
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
    expect(audit.events).toMatchObject([
      { action: 'reactivated', enrollment: { passport: '631', active: true } },
    ]);
  });

  it('opens the renewals list on the 1 month default', async () => {
    ctx.repository.insert(
      buildInput({ passport: '900', name: 'Old Timer', enrolledAt: isoDaysAgo(40) }),
    );
    ctx.repository.insert(
      buildInput({ passport: '901', name: 'Fresh Member', enrolledAt: isoDaysAgo(3) }),
    );

    const interaction = fakeButtonInteraction('enrollment:due');
    await handleEnrollmentInteraction(interaction, ctx);

    const payload = replyArg(interaction);
    expect(embedTitle(payload)).toBe(messages.dueView.title);
    const description = replyEmbed(payload)?.data.description ?? '';
    expect(description).toContain('Old Timer');
    expect(description).not.toContain('Fresh Member');
    expect(ctx.sessions.get('user-1')).toMatchObject({ view: 'due', period: '1m', page: 0 });
  });

  it('switches the renewal period to 2 weeks', async () => {
    ctx.repository.insert(
      buildInput({ passport: '902', name: 'Three Weeks Ago', enrolledAt: isoDaysAgo(21) }),
    );
    ctx.sessions.set('user-1', browseState({ view: 'due', period: '1m' }));

    const interaction = fakeButtonInteraction('enrollment:due-period:2w');
    await handleEnrollmentInteraction(interaction, ctx);

    const description = replyEmbed(updateArg(interaction))?.data.description ?? '';
    expect(description).toContain('Three Weeks Ago');
    expect(ctx.sessions.get('user-1').period).toBe('2w');
  });

  it('renews an enrollment to today from the record card, with audit', async () => {
    ctx.repository.insert(
      buildInput({ passport: '903', name: 'Renew Me', enrolledAt: isoDaysAgo(40) }),
    );

    const interaction = fakeButtonInteraction('enrollment:renew:903');
    await handleEnrollmentInteraction(interaction, ctx);

    expect(ctx.repository.findByPassport('903')?.enrolledAt).toBe(getTodayISO());
    expect(replyEmbed(updateArg(interaction))?.data.description).toBe(
      messages.detailView.renewedNote,
    );
    expect(audit.events).toMatchObject([
      {
        action: 'renewed',
        enrollment: { passport: '903' },
        changes: [
          {
            label: messages.addModal.fields.enrolledAt,
            before: formatDateBR(isoDaysAgo(40)),
            after: formatDateBR(getTodayISO()),
          },
        ],
      },
    ]);
  });

  it('renewing an enrollment already dated today changes nothing', async () => {
    ctx.repository.insert(
      buildInput({ passport: '904', name: 'Fresh Pay', enrolledAt: getTodayISO() }),
    );

    const interaction = fakeButtonInteraction('enrollment:renew:904');
    await handleEnrollmentInteraction(interaction, ctx);

    expect(replyEmbed(updateArg(interaction))?.data.description).toBe(
      messages.detailView.renewedAlreadyNote,
    );
    expect(audit.events).toEqual([]);
  });

  it('goes back to the renewals list when the session is on the due view', async () => {
    ctx.repository.insert(
      buildInput({ passport: '905', name: 'Due Person', enrolledAt: isoDaysAgo(40) }),
    );
    ctx.sessions.set('user-1', browseState({ view: 'due', period: '1m' }));

    const interaction = fakeButtonInteraction('enrollment:back');
    await handleEnrollmentInteraction(interaction, ctx);

    expect(embedTitle(updateArg(interaction))).toBe(messages.dueView.title);
  });

  it('goes back from the card to the list keeping the session state', async () => {
    ctx.sessions.set('user-1', browseState({ filter: 'ryo' }));

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
    ctx.sessions.set('user-1', browseState({ filter: 'john' }));

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
