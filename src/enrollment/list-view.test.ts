import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../database.js';
import { messages } from '../messages.js';
import { buildListView, PAGE_SIZE } from './list-view.js';
import { browseState } from './test-utils.js';
import { EnrollmentRepository } from './repository.js';

interface ButtonJSON {
  custom_id: string;
  disabled?: boolean;
}

function buttonRow(view: ReturnType<typeof buildListView>): ButtonJSON[] {
  const rows = view.payload.components.map((row) => row.toJSON());
  const last = rows.at(-1) as { components: ButtonJSON[] } | undefined;
  return last?.components ?? [];
}

describe('buildListView', () => {
  let db: Database;
  let repository: EnrollmentRepository;

  beforeEach(() => {
    db = createDatabase(':memory:');
    repository = new EnrollmentRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  function seed(count: number): void {
    for (let i = 0; i < count; i += 1) {
      repository.insert({
        passport: `${i}`,
        name: `Person ${String(i).padStart(2, '0')}`,
        phone: `(${100 + i}) 123-456`,
        gym: 'both',
        enrolledAt: '2026-07-22',
        registeredBy: 'tester#0',
      });
    }
  }

  it('shows a friendly empty state without a select', () => {
    const view = buildListView(repository, browseState({ page: 0 }));

    expect(view.payload.embeds[0]?.data.description).toBe(messages.listView.emptyAll);
    expect(view.payload.components).toHaveLength(1); // only the buttons row
    expect(buttonRow(view).map((b) => b.custom_id)).toEqual(['enrollment:filter']);
  });

  it('lists a page with labeled lines and a footer', () => {
    seed(3);
    const view = buildListView(repository, browseState({ page: 0 }));

    const description = view.payload.embeds[0]?.data.description ?? '';
    expect(description).toContain('**0 — Person 00**');
    expect(description).toContain('Telefone: (100) 123-456 · Academia: As duas');
    expect(view.payload.embeds[0]?.data.footer?.text).toBe(messages.listView.footer(1, 1, 3));
  });

  it('hides pagination buttons for a single page', () => {
    seed(3);
    const view = buildListView(repository, browseState({ page: 0 }));

    expect(buttonRow(view).map((b) => b.custom_id)).toEqual(['enrollment:filter']);
  });

  it('paginates and disables the buttons at the edges', () => {
    seed(PAGE_SIZE + 2);

    const first = buildListView(repository, browseState({ page: 0 }));
    const firstButtons = buttonRow(first);
    expect(firstButtons.find((b) => b.custom_id === 'enrollment:prev')?.disabled).toBe(true);
    expect(firstButtons.find((b) => b.custom_id === 'enrollment:next')?.disabled).toBe(false);

    const last = buildListView(repository, browseState({ page: 1 }));
    const lastButtons = buttonRow(last);
    expect(lastButtons.find((b) => b.custom_id === 'enrollment:prev')?.disabled).toBe(false);
    expect(lastButtons.find((b) => b.custom_id === 'enrollment:next')?.disabled).toBe(true);
    expect(last.payload.embeds[0]?.data.footer?.text).toContain('Página 2/2');
  });

  it('clamps an out-of-range page into the valid range', () => {
    seed(PAGE_SIZE + 2);

    const view = buildListView(repository, browseState({ page: 99 }));

    expect(view.state.page).toBe(1);
    expect(view.payload.embeds[0]?.data.footer?.text).toContain('Página 2/2');
  });

  it('shows the filter in the footer and offers clearing it', () => {
    seed(3);
    const view = buildListView(repository, browseState({ filter: 'Person' }));

    expect(view.payload.embeds[0]?.data.footer?.text).toContain(
      messages.listView.filterNote('Person'),
    );
    expect(buttonRow(view).map((b) => b.custom_id)).toContain('enrollment:clear-filter');
  });
});
