import { and, asc, count, desc, eq, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../database.js';
import { enrollments } from '../db/schema.js';
import { nowTimestamp } from './format.js';
import type { Enrollment, EnrollmentInput, EnrollmentUpdate } from './types.js';

export interface EnrollmentPage {
  items: Enrollment[];
  total: number;
}

export class EnrollmentRepository {
  constructor(private readonly db: Database) {}

  async findByPassport(passport: string): Promise<Enrollment | undefined> {
    const [row] = await this.db
      .select()
      .from(enrollments)
      .where(eq(enrollments.passport, passport));
    return row;
  }

  async findByPhone(phone: string): Promise<Enrollment | undefined> {
    const [row] = await this.db.select().from(enrollments).where(eq(enrollments.phone, phone));
    return row;
  }

  async insert(input: EnrollmentInput): Promise<void> {
    await this.db.insert(enrollments).values(input);
  }

  /** Reactivates an inactive enrollment, replacing its data with the new input. */
  async reactivate(input: EnrollmentInput): Promise<void> {
    const { passport, ...data } = input;
    await this.db
      .update(enrollments)
      .set({
        ...data,
        active: true,
        deactivatedBy: null,
        deactivatedAt: null,
        updatedAt: nowTimestamp(),
      })
      .where(eq(enrollments.passport, passport));
  }

  /** Updates only the provided fields; undefined fields keep their current value. */
  async update(changes: EnrollmentUpdate): Promise<void> {
    const { passport, ...fields } = changes;
    await this.db
      .update(enrollments)
      .set({ ...fields, updatedAt: nowTimestamp() })
      .where(eq(enrollments.passport, passport));
  }

  /** Enrollments are never deleted — only marked inactive, recording who did it. */
  async deactivate(passport: string, deactivatedBy: string): Promise<void> {
    await this.db
      .update(enrollments)
      .set({
        active: false,
        deactivatedBy,
        deactivatedAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
      })
      .where(eq(enrollments.passport, passport));
  }

  /** Reactivates keeping the current data (used from the detail card). */
  async activate(passport: string): Promise<void> {
    await this.db
      .update(enrollments)
      .set({
        active: true,
        deactivatedBy: null,
        deactivatedAt: null,
        updatedAt: nowTimestamp(),
      })
      .where(eq(enrollments.passport, passport));
  }

  /**
   * Pages through enrollments, active first then by name. An empty filter lists
   * everything; otherwise matches exact passport or partial name (case-insensitive).
   */
  async list(filter: string, page: number, pageSize: number): Promise<EnrollmentPage> {
    const where = filter
      ? or(eq(enrollments.passport, filter), ilike(enrollments.name, `%${filter}%`))
      : undefined;
    return this.page(
      where,
      [desc(enrollments.active), asc(sql`lower(${enrollments.name})`), asc(enrollments.id)],
      page,
      pageSize,
    );
  }

  /**
   * Pages through active enrollments due for renewal — enrolled on or before
   * `cutoffIso` (yyyy-mm-dd) — oldest enrollment first.
   */
  async listDue(cutoffIso: string, page: number, pageSize: number): Promise<EnrollmentPage> {
    const where = and(eq(enrollments.active, true), lte(enrollments.enrolledAt, cutoffIso));
    return this.page(where, [asc(enrollments.enrolledAt), asc(enrollments.id)], page, pageSize);
  }

  private async page(
    where: SQL | undefined,
    orderBy: SQL[],
    page: number,
    pageSize: number,
  ): Promise<EnrollmentPage> {
    const [totals, items] = await Promise.all([
      this.db.select({ total: count() }).from(enrollments).where(where),
      this.db
        .select()
        .from(enrollments)
        .where(where)
        .orderBy(...orderBy)
        .limit(pageSize)
        .offset(page * pageSize),
    ]);
    return { items, total: totals[0]?.total ?? 0 };
  }
}
