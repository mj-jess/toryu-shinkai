import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { migrationsFolder, type Database } from '../database.js';

export interface TestDatabase {
  db: Database;
  /** Empties every table — call between tests to reuse one instance per file. */
  reset(): Promise<void>;
  close(): Promise<void>;
}

/**
 * In-memory Postgres (PGlite) with the real migrations applied, so tests
 * always exercise the production schema — same philosophy as the old
 * `createDatabase(':memory:')`, now speaking actual Postgres.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: migrationsFolder() });
  return {
    db,
    reset: async () => {
      await db.execute(sql`TRUNCATE TABLE enrollments RESTART IDENTITY`);
      await db.execute(sql`TRUNCATE TABLE settings`);
    },
    close: () => client.close(),
  };
}
