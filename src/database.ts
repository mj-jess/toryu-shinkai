import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

/** Driver-agnostic handle: node-postgres in production, PGlite in tests. */
export type Database = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

/** Absolute path to the drizzle migrations folder (works from any cwd). */
export function migrationsFolder(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');
}

/** Connects to Postgres (Neon) and applies pending migrations. */
export async function createDatabase(connectionString: string): Promise<Database> {
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: migrationsFolder() });
  return db;
}
