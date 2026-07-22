import DatabaseConstructor, { type Database } from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from './migrations.js';

/** Creates a database at the given location (`':memory:'` for tests) and applies all migrations. */
export function createDatabase(location: string): Database {
  const db = new DatabaseConstructor(location);
  db.pragma('journal_mode = WAL');
  runMigrations(db);
  return db;
}

let defaultDatabase: Database | undefined;

/** Lazily opens the production database at `data/family.db`. */
export function getDefaultDatabase(): Database {
  if (!defaultDatabase) {
    const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
    const dataDir = join(projectRoot, 'data');
    mkdirSync(dataDir, { recursive: true });
    defaultDatabase = createDatabase(join(dataDir, 'family.db'));
  }
  return defaultDatabase;
}
