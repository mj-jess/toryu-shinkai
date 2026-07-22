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

  it('deactivates without deleting', () => {
    repository.insert(buildInput());
    repository.deactivate('12345');

    const found = repository.findByPassport('12345');
    expect(found?.active).toBe(false);
    expect(found?.name).toBe('John Doe');
  });

  it('reactivates an inactive enrollment with fresh data', () => {
    repository.insert(buildInput());
    repository.deactivate('12345');

    repository.reactivate(
      buildInput({ name: 'John Updated', gym: 'sandy', phone: '(999) 888-777' }),
    );

    const found = repository.findByPassport('12345');
    expect(found).toMatchObject({
      name: 'John Updated',
      gym: 'sandy',
      phone: '(999) 888-777',
      active: true,
    });
  });

  it('counts only active enrollments', () => {
    repository.insert(buildInput({ passport: '1' }));
    repository.insert(buildInput({ passport: '2' }));
    repository.deactivate('1');

    expect(repository.countActive()).toBe(1);
  });
});
