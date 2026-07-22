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

export interface EnrollmentCounts {
  active: number;
  inactive: number;
}

export class EnrollmentRepository {
  private readonly findByPassportStmt: Statement<[string], EnrollmentRow>;
  private readonly insertStmt: Statement<[EnrollmentInput]>;
  private readonly reactivateStmt: Statement<[EnrollmentInput]>;
  private readonly updateStmt: Statement<[Record<string, string | null>]>;
  private readonly deactivateStmt: Statement<[{ passport: string; deactivatedBy: string }]>;
  private readonly searchStmt: Statement<[{ passport: string; name: string }], EnrollmentRow>;
  private readonly listRecentStmt: Statement<[number], EnrollmentRow>;
  private readonly countsStmt: Statement<[], { active: number; inactive: number }>;

  constructor(db: Database) {
    this.findByPassportStmt = db.prepare('SELECT * FROM enrollments WHERE passport = ?');

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

    this.searchStmt = db.prepare(`
      SELECT * FROM enrollments
      WHERE passport = @passport OR name LIKE @name
      ORDER BY active DESC, name COLLATE NOCASE
      LIMIT 20
    `);

    this.listRecentStmt = db.prepare(`
      SELECT * FROM enrollments ORDER BY created_at DESC, id DESC LIMIT ?
    `);

    this.countsStmt = db.prepare(`
      SELECT
        SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) AS inactive
      FROM enrollments
    `);
  }

  findByPassport(passport: string): Enrollment | undefined {
    const row = this.findByPassportStmt.get(passport);
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

  /** Matches by exact passport or partial name (case-insensitive), active first. */
  search(term: string): Enrollment[] {
    return this.searchStmt.all({ passport: term, name: `%${term}%` }).map(toEnrollment);
  }

  listRecent(limit = 20): Enrollment[] {
    return this.listRecentStmt.all(limit).map(toEnrollment);
  }

  counts(): EnrollmentCounts {
    const row = this.countsStmt.get();
    return { active: row?.active ?? 0, inactive: row?.inactive ?? 0 };
  }

  countActive(): number {
    return this.counts().active;
  }
}
