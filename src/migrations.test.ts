import DatabaseConstructor, { type Database } from 'better-sqlite3';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runMigrations } from './migrations.js';

function currentVersion(db: Database): number {
  return db.pragma('user_version', { simple: true }) as number;
}

function tableNames(db: Database): string[] {
  return db
    .prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all()
    .map((row) => row.name);
}

describe('runMigrations', () => {
  let dir: string;
  let db: Database;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'migrations-test-'));
    db = new DatabaseConstructor(':memory:');
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('applies pending migrations in order and records the version', () => {
    writeFileSync(join(dir, '001-create-a.sql'), 'CREATE TABLE a (id INTEGER);');
    writeFileSync(join(dir, '002-create-b.sql'), 'CREATE TABLE b (id INTEGER);');

    runMigrations(db, dir);

    expect(tableNames(db)).toEqual(expect.arrayContaining(['a', 'b']));
    expect(currentVersion(db)).toBe(2);
  });

  it('skips migrations that were already applied', () => {
    writeFileSync(join(dir, '001-create-a.sql'), 'CREATE TABLE a (id INTEGER);');
    runMigrations(db, dir);

    // Re-running must not fail on the already-existing table.
    runMigrations(db, dir);

    expect(currentVersion(db)).toBe(1);
  });

  it('applies only migrations newer than the recorded version', () => {
    writeFileSync(join(dir, '001-create-a.sql'), 'CREATE TABLE a (id INTEGER);');
    runMigrations(db, dir);

    writeFileSync(join(dir, '002-create-b.sql'), 'CREATE TABLE b (id INTEGER);');
    runMigrations(db, dir);

    expect(tableNames(db)).toEqual(expect.arrayContaining(['a', 'b']));
    expect(currentVersion(db)).toBe(2);
  });

  it('rolls back a failing migration entirely', () => {
    writeFileSync(
      join(dir, '001-broken.sql'),
      'CREATE TABLE a (id INTEGER); CREATE TABLE a (id INTEGER);',
    );

    expect(() => runMigrations(db, dir)).toThrow();
    expect(tableNames(db)).not.toContain('a');
    expect(currentVersion(db)).toBe(0);
  });

  it('rejects filenames without a numeric version prefix', () => {
    writeFileSync(join(dir, 'create-a.sql'), 'CREATE TABLE a (id INTEGER);');

    expect(() => runMigrations(db, dir)).toThrow(/Invalid migration filename/);
  });

  it('rejects duplicate version numbers', () => {
    writeFileSync(join(dir, '001-create-a.sql'), 'CREATE TABLE a (id INTEGER);');
    writeFileSync(join(dir, '001-create-b.sql'), 'CREATE TABLE b (id INTEGER);');

    expect(() => runMigrations(db, dir)).toThrow(/strictly increasing/);
  });
});
