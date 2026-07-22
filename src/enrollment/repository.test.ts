import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../database.js';
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
  let db: Database;
  let repository: EnrollmentRepository;

  beforeEach(() => {
    db = createDatabase(':memory:');
    repository = new EnrollmentRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('inserts and finds an enrollment by passport', () => {
    repository.insert(buildInput({ phone: '(123) 456-789' }));

    const found = repository.findByPassport('12345');
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

  it('finds an enrollment by phone', () => {
    repository.insert(buildInput({ phone: '(111) 222-333' }));

    expect(repository.findByPhone('(111) 222-333')?.passport).toBe('12345');
    expect(repository.findByPhone('(999) 999-999')).toBeUndefined();
  });

  it('rejects duplicate passports', () => {
    repository.insert(buildInput());
    expect(() => repository.insert(buildInput({ name: 'Other' }))).toThrow(/UNIQUE/);
  });

  it('rejects duplicate phones', () => {
    repository.insert(buildInput({ phone: '(111) 222-333' }));
    expect(() => repository.insert(buildInput({ passport: '99', phone: '(111) 222-333' }))).toThrow(
      /UNIQUE/,
    );
  });

  it('deactivates without deleting, recording the audit trail', () => {
    repository.insert(buildInput());
    repository.deactivate('12345', 'admin#1');

    const found = repository.findByPassport('12345');
    expect(found?.active).toBe(false);
    expect(found?.deactivatedBy).toBe('admin#1');
    expect(found?.deactivatedAt).toBeTruthy();
  });

  it('activate reactivates keeping data and clears the audit trail', () => {
    repository.insert(buildInput({ name: 'Keep Me' }));
    repository.deactivate('12345', 'admin#1');

    repository.activate('12345');

    expect(repository.findByPassport('12345')).toMatchObject({
      name: 'Keep Me',
      active: true,
      deactivatedBy: null,
      deactivatedAt: null,
    });
  });

  it('reactivate replaces data and clears the audit trail', () => {
    repository.insert(buildInput());
    repository.deactivate('12345', 'admin#1');

    repository.reactivate(buildInput({ name: 'John Updated', gym: 'sandy' }));

    expect(repository.findByPassport('12345')).toMatchObject({
      name: 'John Updated',
      gym: 'sandy',
      active: true,
      deactivatedBy: null,
      deactivatedAt: null,
    });
  });

  it('update changes only the provided fields', () => {
    repository.insert(buildInput({ phone: '(123) 456-789' }));

    repository.update({ passport: '12345', name: 'Renamed' });

    expect(repository.findByPassport('12345')).toMatchObject({
      name: 'Renamed',
      phone: '(123) 456-789',
      gym: 'both',
      enrolledAt: '2026-07-22',
    });
  });

  describe('list', () => {
    beforeEach(() => {
      repository.insert(buildInput({ passport: '1', name: 'Carol' }));
      repository.insert(buildInput({ passport: '2', name: 'alice' }));
      repository.insert(buildInput({ passport: '3', name: 'Bob' }));
      repository.deactivate('3', 'admin#1');
    });

    it('lists everything for an empty filter, active first then by name', () => {
      const { items, total } = repository.list('', 0, 10);
      expect(total).toBe(3);
      expect(items.map((e) => e.name)).toEqual(['alice', 'Carol', 'Bob']);
    });

    it('paginates with a stable order', () => {
      const first = repository.list('', 0, 2);
      const second = repository.list('', 1, 2);
      expect(first.items.map((e) => e.name)).toEqual(['alice', 'Carol']);
      expect(second.items.map((e) => e.name)).toEqual(['Bob']);
      expect(second.total).toBe(3);
    });

    it('filters by exact passport', () => {
      const { items, total } = repository.list('1', 0, 10);
      expect(total).toBe(1);
      expect(items[0]?.name).toBe('Carol');
    });

    it('filters by partial name, case-insensitive', () => {
      const { items } = repository.list('ALI', 0, 10);
      expect(items.map((e) => e.name)).toEqual(['alice']);
    });

    it('returns an empty page when nothing matches', () => {
      expect(repository.list('nobody', 0, 10)).toEqual({ items: [], total: 0 });
    });
  });

  describe('listDue', () => {
    beforeEach(() => {
      repository.insert(buildInput({ passport: '1', name: 'Oldest', enrolledAt: '2026-04-01' }));
      repository.insert(buildInput({ passport: '2', name: 'OnCutoff', enrolledAt: '2026-06-01' }));
      repository.insert(buildInput({ passport: '3', name: 'Recent', enrolledAt: '2026-07-20' }));
      repository.insert(
        buildInput({ passport: '4', name: 'OldInactive', enrolledAt: '2026-01-01' }),
      );
      repository.deactivate('4', 'admin#1');
    });

    it('returns active enrollments on or before the cutoff, oldest first', () => {
      const { items, total } = repository.listDue('2026-06-01', 0, 10);
      expect(total).toBe(2);
      expect(items.map((e) => e.name)).toEqual(['Oldest', 'OnCutoff']);
    });

    it('excludes inactive enrollments even when overdue', () => {
      const { items } = repository.listDue('2026-06-01', 0, 10);
      expect(items.map((e) => e.name)).not.toContain('OldInactive');
    });

    it('paginates keeping the oldest-first order', () => {
      const first = repository.listDue('2026-07-31', 0, 2);
      const second = repository.listDue('2026-07-31', 1, 2);
      expect(first.items.map((e) => e.name)).toEqual(['Oldest', 'OnCutoff']);
      expect(second.items.map((e) => e.name)).toEqual(['Recent']);
      expect(second.total).toBe(3);
    });
  });
});
