import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, serial, text } from 'drizzle-orm/pg-core';

/**
 * Dates are stored as ISO strings (`yyyy-mm-dd`) and timestamps as
 * `yyyy-mm-dd hh:mm:ss`, matching what the app already speaks — only the
 * database layer changed in the SQLite → Postgres migration.
 */
export const enrollments = pgTable(
  'enrollments',
  {
    id: serial('id').primaryKey(),
    passport: text('passport').notNull().unique(),
    name: text('name').notNull(),
    phone: text('phone').notNull().unique(),
    gym: text('gym', { enum: ['sandy', 'vinewood', 'both'] }).notNull(),
    enrolledAt: text('enrolled_at').notNull(),
    active: boolean('active').notNull().default(true),
    registeredBy: text('registered_by'),
    deactivatedBy: text('deactivated_by'),
    deactivatedAt: text('deactivated_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`to_char(now(), 'YYYY-MM-DD HH24:MI:SS')`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`to_char(now(), 'YYYY-MM-DD HH24:MI:SS')`),
  },
  (table) => [check('enrollments_gym_check', sql`${table.gym} IN ('sandy', 'vinewood', 'both')`)],
);

/** Key-value store for bot configuration (e.g. the audit log channel). */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
