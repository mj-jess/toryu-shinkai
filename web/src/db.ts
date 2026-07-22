import { neon } from '@neondatabase/serverless';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { enrollments } from '@bot/db/schema';
import type { Enrollment } from '@bot/enrollment/types';

let db: NeonHttpDatabase | null = null;

/** Lazy singleton over Neon's HTTP driver — a good fit for serverless (Vercel). */
function getDb(): NeonHttpDatabase {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    db = drizzle(neon(url));
  }
  return db;
}

/** All enrollments, active first then by name — sorting/filtering happens in the grid. */
export async function listEnrollments(): Promise<Enrollment[]> {
  return getDb()
    .select()
    .from(enrollments)
    .orderBy(desc(enrollments.active), asc(sql`lower(${enrollments.name})`), asc(enrollments.id));
}

export async function findEnrollment(passport: string): Promise<Enrollment | undefined> {
  const rows = await getDb().select().from(enrollments).where(eq(enrollments.passport, passport));
  return rows[0];
}
