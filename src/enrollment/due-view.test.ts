import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../db/test-database.js';
import { messages } from '../messages.js';
import { buildDueView } from './due-view.js';
import { isoDaysAgo } from './format.js';
import { PAGE_SIZE, type ListViewResult } from './list-view.js';
import { EnrollmentRepository } from './repository.js';
import { browseState } from './test-utils.js';

interface ButtonJSON {
  custom_id: string;
  style: number;
  disabled?: boolean;
}

function rowButtons(view: ListViewResult, index: number): ButtonJSON[] {
  const row = view.payload.components[index]?.toJSON() as { components: ButtonJSON[] } | undefined;
  return row?.components ?? [];
}

describe('buildDueView', () => {
  let testDb: TestDatabase;
  let repository: EnrollmentRepository;
  let phoneSeed = 100;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    repository = new EnrollmentRepository(testDb.db);
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
  });

  async function seedAt(passport: string, name: string, daysAgo: number, active = true) {
    phoneSeed += 1;
    await repository.insert({
      passport,
      name,
      phone: `(${phoneSeed}) 123-456`,
      gym: 'both',
      enrolledAt: isoDaysAgo(daysAgo),
      registeredBy: 'tester#0',
    });
    if (!active) await repository.deactivate(passport, 'admin#1');
  }

  it('shows a celebratory empty state with only the period buttons', async () => {
    await seedAt('1', 'Fresh', 3);

    const view = await buildDueView(repository, browseState({ view: 'due', period: '1m' }));

    expect(view.payload.embeds[0]?.data.description).toBe(
      messages.dueView.empty(messages.dueView.periodLabels['1m']),
    );
    expect(view.payload.components).toHaveLength(1); // period toggles only
  });

  it('lists overdue actives oldest first, with days elapsed and the period footer', async () => {
    await seedAt('1', 'Older', 60);
    await seedAt('2', 'Newer', 40);
    await seedAt('3', 'Recent', 3);
    await seedAt('4', 'GoneLong', 90, false);

    const view = await buildDueView(repository, browseState({ view: 'due', period: '1m' }));
    const description = view.payload.embeds[0]?.data.description ?? '';

    expect(description.indexOf('Older')).toBeLessThan(description.indexOf('Newer'));
    expect(description).toContain('(há 60 dias)');
    expect(description).not.toContain('Recent');
    expect(description).not.toContain('GoneLong');
    expect(view.payload.embeds[0]?.data.footer?.text).toContain(
      messages.dueView.periodNote(messages.dueView.periodLabels['1m']),
    );
  });

  it('respects the 2 weeks period', async () => {
    await seedAt('1', 'ThreeWeeks', 21);
    await seedAt('2', 'OneWeek', 7);

    const view = await buildDueView(repository, browseState({ view: 'due', period: '2w' }));
    const description = view.payload.embeds[0]?.data.description ?? '';

    expect(description).toContain('ThreeWeeks');
    expect(description).not.toContain('OneWeek');
  });

  it('highlights the active period button', async () => {
    const view = await buildDueView(repository, browseState({ view: 'due', period: '2w' }));
    const [twoWeeks, oneMonth] = rowButtons(view, 0);

    expect(twoWeeks?.custom_id).toBe('enrollment:due-period:2w');
    expect(twoWeeks?.style).toBe(3); // Success = active
    expect(oneMonth?.custom_id).toBe('enrollment:due-period:1m');
    expect(oneMonth?.style).toBe(2); // Secondary = inactive
  });

  it('paginates and clamps the page like the browse list', async () => {
    for (let i = 0; i < PAGE_SIZE + 2; i += 1) {
      await seedAt(`${i}`, `Person ${String(i).padStart(2, '0')}`, 40 + i);
    }

    const view = await buildDueView(
      repository,
      browseState({ view: 'due', period: '1m', page: 99 }),
    );

    expect(view.state.page).toBe(1);
    expect(view.payload.embeds[0]?.data.footer?.text).toContain('Página 2/2');
    const pagination = rowButtons(view, 2);
    expect(pagination.find((b) => b.custom_id === 'enrollment:next')?.disabled).toBe(true);
  });
});
