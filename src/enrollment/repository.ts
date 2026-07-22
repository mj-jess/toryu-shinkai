import type { Database, Statement } from 'better-sqlite3';
import type { Enrollment, EnrollmentInput, Gym } from './types.js';

interface EnrollmentRow {
  id: number;
  passport: string;
  name: string;
  phone: string;
  gym: Gym;
  enrolled_at: string;
  active: 0 | 1;
  registered_by: string | null;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class EnrollmentRepository {
  private readonly findByPassportStmt: Statement<[string], EnrollmentRow>;
  private readonly insertStmt: Statement<[EnrollmentInput]>;
  private readonly reactivateStmt: Statement<[EnrollmentInput]>;
  private readonly deactivateStmt: Statement<[string]>;
  private readonly countActiveStmt: Statement<[], { total: number }>;

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
          updated_at = datetime('now', 'localtime')
      WHERE passport = @passport
    `);

    this.deactivateStmt = db.prepare(`
      UPDATE enrollments
      SET active = 0, updated_at = datetime('now', 'localtime')
      WHERE passport = ?
    `);

    this.countActiveStmt = db.prepare('SELECT COUNT(*) AS total FROM enrollments WHERE active = 1');
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

  /** Enrollments are never deleted — only marked inactive. */
  deactivate(passport: string): void {
    this.deactivateStmt.run(passport);
  }

  countActive(): number {
    return this.countActiveStmt.get()?.total ?? 0;
  }
}
