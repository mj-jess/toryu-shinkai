import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { migrationsFolder, type Database } from '../database.js';

export interface TestDatabase {
  db: Database;
  /** Empties enrollments and settings — call between tests to reuse one instance per file. */
  reset(): Promise<void>;
  /** Empties the KOI sales, keeping the seeded catalog intact. */
  resetSales(): Promise<void>;
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
    resetSales: async () => {
      await db.execute(sql`TRUNCATE TABLE koi_sale_items, koi_sales RESTART IDENTITY`);
    },
    close: () => client.close(),
  };
}
