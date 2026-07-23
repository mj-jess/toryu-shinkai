import { sql } from 'drizzle-orm';
import { createDatabase } from '../database.js';

/**
 * Applies pending migrations to DATABASE_URL without booting the bot.
 * Run with: npm run db:migrate:dev (reads .env.local).
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
console.log('Applying migrations to', new URL(url).hostname);

const db = await createDatabase(url);
// The generic Database type erases driver result typing; cast for the log below.
const tables = (await db.execute(
  sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
)) as unknown as { rows: { table_name: string }[] };
console.log(
  'Tables:',
  tables.rows.map((row) => row.table_name),
);
process.exit(0);
