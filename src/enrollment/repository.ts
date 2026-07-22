import type { Database, Statement } from 'better-sqlite3';
import type { Enrollment, EnrollmentInput, EnrollmentUpdate, Gym } from './types.js';

interface EnrollmentRow {
  id: number;
  passport: string;
  name: string;
  phone: string;
  gym: Gym;
  enrolled_at: string;
  active: 0 | 1;
  registered_by: string | null;
  deactivated_by: string | null;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}

function toEnrollment(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    passport: row.passport,
    name: row.name,
    phone: row.phone,
    gym: row.gym,
    enrolledAt: row.enrolled_at,
    active: row.active === 1,
    registeredBy: row.registered_by,
    deactivatedBy: row.deactivated_by,
    deactivatedAt: row.deactivated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface EnrollmentPage {
  items: Enrollment[];
  total: number;
}

interface ListParams {
  passport: string;
  name: string;
  limit: number;
  offset: number;
}

interface FilterParams {
  passport: string;
  name: string;
}

interface ListDueParams {
  cutoff: string;
  limit: number;
  offset: number;
}

export class EnrollmentRepository {
  private readonly findByPassportStmt: Statement<[string], EnrollmentRow>;
  private readonly findByPhoneStmt: Statement<[string], EnrollmentRow>;
  private readonly insertStmt: Statement<[EnrollmentInput]>;
  private readonly reactivateStmt: Statement<[EnrollmentInput]>;
  private readonly updateStmt: Statement<[Record<string, string | null>]>;
  private readonly deactivateStmt: Statement<[{ passport: string; deactivatedBy: string }]>;
  private readonly activateStmt: Statement<[string]>;
  private readonly listStmt: Statement<[ListParams], EnrollmentRow>;
  private readonly countStmt: Statement<[FilterParams], { total: number }>;
  private readonly listDueStmt: Statement<[ListDueParams], EnrollmentRow>;
  private readonly countDueStmt: Statement<[{ cutoff: string }], { total: number }>;

  constructor(db: Database) {
    this.findByPassportStmt = db.prepare('SELECT * FROM enrollments WHERE passport = ?');
    this.findByPhoneStmt = db.prepare('SELECT * FROM enrollments WHERE phone = ?');

    this.insertStmt = db.prepare(`
      INSERT INTO enrollments (passport, name, phone, gym, enrolled_at, registered_by)
      VALUES (@passport, @name, @phone, @gym, @enrolledAt, @registeredBy)
    `);

    this.reactivateStmt = db.prepare(`
      UPDATE enrollments
      SET name = @name, phone = @phone, gym = @gym, enrolled_at = @enrolledAt,
          active = 1, registered_by = @registeredBy,
          deactivated_by = NULL, deactivated_at = NULL,
          updated_at = datetime('now', 'localtime')
      WHERE passport = @passport
    `);

    this.updateStmt = db.prepare(`
      UPDATE enrollments
      SET name = COALESCE(@name, name),
          phone = COALESCE(@phone, phone),
          gym = COALESCE(@gym, gym),
          enrolled_at = COALESCE(@enrolledAt, enrolled_at),
          updated_at = datetime('now', 'localtime')
      WHERE passport = @passport
    `);

    this.deactivateStmt = db.prepare(`
      UPDATE enrollments
      SET active = 0,
          deactivated_by = @deactivatedBy,
          deactivated_at = datetime('now', 'localtime'),
          updated_at = datetime('now', 'localtime')
      WHERE passport = @passport
    `);

    this.activateStmt = db.prepare(`
      UPDATE enrollments
      SET active = 1,
          deactivated_by = NULL,
          deactivated_at = NULL,
          updated_at = datetime('now', 'localtime')
      WHERE passport = ?
    `);

    const filterClause = "(@passport = '' OR passport = @passport OR name LIKE @name)";

    this.listStmt = db.prepare(`
      SELECT * FROM enrollments
      WHERE ${filterClause}
      ORDER BY active DESC, name COLLATE NOCASE, id
      LIMIT @limit OFFSET @offset
    `);

    this.countStmt = db.prepare(`
      SELECT COUNT(*) AS total FROM enrollments WHERE ${filterClause}
    `);

    const dueClause = 'active = 1 AND enrolled_at <= @cutoff';

    this.listDueStmt = db.prepare(`
      SELECT * FROM enrollments
      WHERE ${dueClause}
      ORDER BY enrolled_at, id
      LIMIT @limit OFFSET @offset
    `);

    this.countDueStmt = db.prepare(`
      SELECT COUNT(*) AS total FROM enrollments WHERE ${dueClause}
    `);
  }

  findByPassport(passport: string): Enrollment | undefined {
    const row = this.findByPassportStmt.get(passport);
    return row ? toEnrollment(row) : undefined;
  }

  findByPhone(phone: string): Enrollment | undefined {
    const row = this.findByPhoneStmt.get(phone);
    return row ? toEnrollment(row) : undefined;
  }

  insert(input: EnrollmentInput): void {
    this.insertStmt.run(input);
  }

  /** Reactivates an inactive enrollment, replacing its data with the new input. */
  reactivate(input: EnrollmentInput): void {
    this.reactivateStmt.run(input);
  }

  /** Updates only the provided fields; undefined fields keep their current value. */
  update(changes: EnrollmentUpdate): void {
    this.updateStmt.run({
      passport: changes.passport,
      name: changes.name ?? null,
      phone: changes.phone ?? null,
      gym: changes.gym ?? null,
      enrolledAt: changes.enrolledAt ?? null,
    });
  }

  /** Enrollments are never deleted — only marked inactive, recording who did it. */
  deactivate(passport: string, deactivatedBy: string): void {
    this.deactivateStmt.run({ passport, deactivatedBy });
  }

  /** Reactivates keeping the current data (used from the detail card). */
  activate(passport: string): void {
    this.activateStmt.run(passport);
  }

  /**
   * Pages through enrollments, active first then by name. An empty filter lists
   * everything; otherwise matches exact passport or partial name (case-insensitive).
   */
  list(filter: string, page: number, pageSize: number): EnrollmentPage {
    const params: FilterParams = { passport: filter, name: `%${filter}%` };
    const total = this.countStmt.get(params)?.total ?? 0;
    const items = this.listStmt
      .all({ ...params, limit: pageSize, offset: page * pageSize })
      .map(toEnrollment);
    return { items, total };
  }

  /**
   * Pages through active enrollments due for renewal — enrolled on or before
   * `cutoffIso` (yyyy-mm-dd) — oldest enrollment first.
   */
  listDue(cutoffIso: string, page: number, pageSize: number): EnrollmentPage {
    const total = this.countDueStmt.get({ cutoff: cutoffIso })?.total ?? 0;
    const items = this.listDueStmt
      .all({ cutoff: cutoffIso, limit: pageSize, offset: page * pageSize })
      .map(toEnrollment);
    return { items, total };
  }
}
