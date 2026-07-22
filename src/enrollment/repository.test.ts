import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../db/test-database.js';
import { EnrollmentRepository } from './repository.js';
import type { EnrollmentInput } from './types.js';

let phoneSeed = 100;

function buildInput(overrides: Partial<EnrollmentInput> = {}): EnrollmentInput {
  phoneSeed += 1;
  return {
    passport: '12345',
    name: 'John Doe',
    phone: `(${phoneSeed}) 456-789`,
    gym: 'both',
    enrolledAt: '2026-07-22',
    registeredBy: 'tester#0',
    ...overrides,
  };
}

describe('EnrollmentRepository', () => {
  let testDb: TestDatabase;
  let repository: EnrollmentRepository;

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

  it('inserts and finds an enrollment by passport', async () => {
    await repository.insert(buildInput({ phone: '(123) 456-789' }));

    const found = await repository.findByPassport('12345');
    expect(found).toMatchObject({
      passport: '12345',
      name: 'John Doe',
      phone: '(123) 456-789',
      gym: 'both',
      enrolledAt: '2026-07-22',
      active: true,
      registeredBy: 'tester#0',
      deactivatedBy: null,
      deactivatedAt: null,
    });
  });

  it('finds an enrollment by phone', async () => {
    await repository.insert(buildInput({ phone: '(111) 222-333' }));

    expect((await repository.findByPhone('(111) 222-333'))?.passport).toBe('12345');
    expect(await repository.findByPhone('(999) 999-999')).toBeUndefined();
  });

  it('rejects duplicate passports', async () => {
    await repository.insert(buildInput());

    // Drizzle wraps the Postgres error; the unique violation lives in `cause`.
    const error = await repository.insert(buildInput({ name: 'Other' })).catch((e: unknown) => e);
    expect(String((error as Error).cause)).toMatch(/duplicate key/);
  });

  it('rejects duplicate phones', async () => {
    await repository.insert(buildInput({ phone: '(111) 222-333' }));

    const error = await repository
      .insert(buildInput({ passport: '99', phone: '(111) 222-333' }))
      .catch((e: unknown) => e);
    expect(String((error as Error).cause)).toMatch(/duplicate key/);
  });

  it('deactivates without deleting, recording the audit trail', async () => {
    await repository.insert(buildInput());
    await repository.deactivate('12345', 'admin#1');

    const found = await repository.findByPassport('12345');
    expect(found?.active).toBe(false);
    expect(found?.deactivatedBy).toBe('admin#1');
    expect(found?.deactivatedAt).toBeTruthy();
  });

  it('activate reactivates keeping data and clears the audit trail', async () => {
    await repository.insert(buildInput({ name: 'Keep Me' }));
    await repository.deactivate('12345', 'admin#1');

    await repository.activate('12345');

    expect(await repository.findByPassport('12345')).toMatchObject({
      name: 'Keep Me',
      active: true,
      deactivatedBy: null,
      deactivatedAt: null,
    });
  });

  it('reactivate replaces data and clears the audit trail', async () => {
    await repository.insert(buildInput());
    await repository.deactivate('12345', 'admin#1');

    await repository.reactivate(buildInput({ name: 'John Updated', gym: 'sandy' }));

    expect(await repository.findByPassport('12345')).toMatchObject({
      name: 'John Updated',
      gym: 'sandy',
      active: true,
      deactivatedBy: null,
      deactivatedAt: null,
    });
  });

  it('update changes only the provided fields', async () => {
    await repository.insert(buildInput({ phone: '(123) 456-789' }));

    await repository.update({ passport: '12345', name: 'Renamed' });

    expect(await repository.findByPassport('12345')).toMatchObject({
      name: 'Renamed',
      phone: '(123) 456-789',
      gym: 'both',
      enrolledAt: '2026-07-22',
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await repository.insert(buildInput({ passport: '1', name: 'Carol' }));
      await repository.insert(buildInput({ passport: '2', name: 'alice' }));
      await repository.insert(buildInput({ passport: '3', name: 'Bob' }));
      await repository.deactivate('3', 'admin#1');
    });

    it('lists everything for an empty filter, active first then by name', async () => {
      const { items, total } = await repository.list('', 0, 10);
      expect(total).toBe(3);
      expect(items.map((e) => e.name)).toEqual(['alice', 'Carol', 'Bob']);
    });

    it('paginates with a stable order', async () => {
      const first = await repository.list('', 0, 2);
      const second = await repository.list('', 1, 2);
      expect(first.items.map((e) => e.name)).toEqual(['alice', 'Carol']);
      expect(second.items.map((e) => e.name)).toEqual(['Bob']);
      expect(second.total).toBe(3);
    });

    it('filters by exact passport', async () => {
      const { items, total } = await repository.list('1', 0, 10);
      expect(total).toBe(1);
      expect(items[0]?.name).toBe('Carol');
    });

    it('filters by partial name, case-insensitive', async () => {
      const { items } = await repository.list('ALI', 0, 10);
      expect(items.map((e) => e.name)).toEqual(['alice']);
    });

    it('returns an empty page when nothing matches', async () => {
      expect(await repository.list('nobody', 0, 10)).toEqual({ items: [], total: 0 });
    });
  });

  describe('listDue', () => {
    beforeEach(async () => {
      await repository.insert(
        buildInput({ passport: '1', name: 'Oldest', enrolledAt: '2026-04-01' }),
      );
      await repository.insert(
        buildInput({ passport: '2', name: 'OnCutoff', enrolledAt: '2026-06-01' }),
      );
      await repository.insert(
        buildInput({ passport: '3', name: 'Recent', enrolledAt: '2026-07-20' }),
      );
      await repository.insert(
        buildInput({ passport: '4', name: 'OldInactive', enrolledAt: '2026-01-01' }),
      );
      await repository.deactivate('4', 'admin#1');
    });

    it('returns active enrollments on or before the cutoff, oldest first', async () => {
      const { items, total } = await repository.listDue('2026-06-01', 0, 10);
      expect(total).toBe(2);
      expect(items.map((e) => e.name)).toEqual(['Oldest', 'OnCutoff']);
    });

    it('excludes inactive enrollments even when overdue', async () => {
      const { items } = await repository.listDue('2026-06-01', 0, 10);
      expect(items.map((e) => e.name)).not.toContain('OldInactive');
    });

    it('paginates keeping the oldest-first order', async () => {
      const first = await repository.listDue('2026-07-31', 0, 2);
      const second = await repository.listDue('2026-07-31', 1, 2);
      expect(first.items.map((e) => e.name)).toEqual(['Oldest', 'OnCutoff']);
      expect(second.items.map((e) => e.name)).toEqual(['Recent']);
      expect(second.total).toBe(3);
    });
  });
});
