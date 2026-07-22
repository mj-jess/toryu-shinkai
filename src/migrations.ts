import type { Database } from 'better-sqlite3';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'migrations',
);

interface Migration {
  version: number;
  file: string;
  sql: string;
}

function loadMigrations(dir: string): Migration[] {
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  let previousVersion = 0;
  return files.map((file) => {
    const version = Number(file.split('-')[0]);
    if (!Number.isInteger(version) || version <= 0) {
      throw new Error(
        `Invalid migration filename (expected "<number>-<description>.sql"): ${file}`,
      );
    }
    if (version <= previousVersion) {
      throw new Error(`Migration versions must be strictly increasing: ${file}`);
    }
    previousVersion = version;
    return { version, file, sql: readFileSync(join(dir, file), 'utf8') };
  });
}

/**
 * Applies pending migrations in order. The applied version is tracked in the
 * database itself via `PRAGMA user_version`, so this is safe to run on every boot.
 */
export function runMigrations(db: Database, dir = DEFAULT_MIGRATIONS_DIR): void {
  const appliedVersion = db.pragma('user_version', { simple: true }) as number;

  for (const migration of loadMigrations(dir)) {
    if (migration.version <= appliedVersion) continue;

    db.transaction(() => {
      db.exec(migration.sql);
      db.pragma(`user_version = ${migration.version}`);
    })();

    console.log(`Applied migration ${migration.file}`);
  }
}
