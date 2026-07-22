import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../database.js';
import { EnrollmentRepository } from './repository.js';
import type { EnrollmentInput } from './types.js';

function buildInput(overrides: Partial<EnrollmentInput> = {}): EnrollmentInput {
  return {
    passport: '12345',
    name: 'John Doe',
    phone: '(123) 456-789',
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
    repository.insert(buildInput());

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
    expect(found?.id).toBeTypeOf('number');
  });

  it('returns undefined for an unknown passport', () => {
    expect(repository.findByPassport('nope')).toBeUndefined();
  });

  it('rejects duplicate passports', () => {
    repository.insert(buildInput());
    expect(() => repository.insert(buildInput({ name: 'Other' }))).toThrow(/UNIQUE/);
  });

  it('deactivates without deleting, recording the audit trail', () => {
    repository.insert(buildInput());
    repository.deactivate('12345', 'admin#1');

    const found = repository.findByPassport('12345');
    expect(found?.active).toBe(false);
    expect(found?.name).toBe('John Doe');
    expect(found?.deactivatedBy).toBe('admin#1');
    expect(found?.deactivatedAt).toBeTruthy();
  });

  it('reactivates an inactive enrollment with fresh data and clears the audit trail', () => {
    repository.insert(buildInput());
    repository.deactivate('12345', 'admin#1');

    repository.reactivate(buildInput({ name: 'John Updated', gym: 'sandy' }));

    const found = repository.findByPassport('12345');
    expect(found).toMatchObject({
      name: 'John Updated',
      gym: 'sandy',
      active: true,
      deactivatedBy: null,
      deactivatedAt: null,
    });
  });

  describe('update', () => {
    it('changes only the provided fields', () => {
      repository.insert(buildInput());

      repository.update({ passport: '12345', name: 'Renamed' });

      expect(repository.findByPassport('12345')).toMatchObject({
        name: 'Renamed',
        phone: '(123) 456-789',
        gym: 'both',
        enrolledAt: '2026-07-22',
      });
    });

    it('can change every editable field at once', () => {
      repository.insert(buildInput());

      repository.update({
        passport: '12345',
        name: 'New Name',
        phone: '(999) 888-777',
        gym: 'vinewood',
        enrolledAt: '2026-01-15',
      });

      expect(repository.findByPassport('12345')).toMatchObject({
        name: 'New Name',
        phone: '(999) 888-777',
        gym: 'vinewood',
        enrolledAt: '2026-01-15',
      });
    });
  });

  describe('search', () => {
    beforeEach(() => {
      repository.insert(buildInput({ passport: '1', name: 'Ryoko Toryu' }));
      repository.insert(buildInput({ passport: '2', name: 'John Doe' }));
      repository.insert(buildInput({ passport: '3', name: 'Jane Doe' }));
      repository.deactivate('3', 'admin#1');
    });

    it('matches by exact passport', () => {
      const results = repository.search('1');
      expect(results.map((e) => e.passport)).toEqual(['1']);
    });

    it('matches by partial name, case-insensitive', () => {
      const results = repository.search('doe');
      expect(results.map((e) => e.name)).toEqual(['John Doe', 'Jane Doe']);
    });

    it('lists active enrollments before inactive ones', () => {
      const results = repository.search('doe');
      expect(results.map((e) => e.active)).toEqual([true, false]);
    });

    it('returns empty for no matches', () => {
      expect(repository.search('nobody')).toEqual([]);
    });
  });

  it('lists recent enrollments up to the limit, newest first', () => {
    repository.insert(buildInput({ passport: '1', name: 'First' }));
    repository.insert(buildInput({ passport: '2', name: 'Second' }));
    repository.insert(buildInput({ passport: '3', name: 'Third' }));

    const recent = repository.listRecent(2);
    expect(recent.map((e) => e.name)).toEqual(['Third', 'Second']);
  });

  it('counts active and inactive enrollments', () => {
    repository.insert(buildInput({ passport: '1' }));
    repository.insert(buildInput({ passport: '2' }));
    repository.deactivate('1', 'admin#1');

    expect(repository.counts()).toEqual({ active: 1, inactive: 1 });
    expect(repository.countActive()).toBe(1);
  });
});
