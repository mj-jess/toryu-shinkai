import type { Database, Statement } from 'better-sqlite3';

/** Key-value store for bot configuration (e.g. the audit log channel). */
export class SettingsRepository {
  private readonly getStmt: Statement<[string], { value: string }>;
  private readonly setStmt: Statement<[{ key: string; value: string }]>;

  constructor(db: Database) {
    this.getStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    this.setStmt = db.prepare(`
      INSERT INTO settings (key, value) VALUES (@key, @value)
      ON CONFLICT (key) DO UPDATE SET value = excluded.value
    `);
  }

  get(key: string): string | undefined {
    return this.getStmt.get(key)?.value;
  }

  set(key: string, value: string): void {
    this.setStmt.run({ key, value });
  }
}
