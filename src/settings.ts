import { eq } from 'drizzle-orm';
import type { Database } from './database.js';
import { settings } from './db/schema.js';

/** Key-value store for bot configuration (e.g. the audit log channel). */
export class SettingsRepository {
  constructor(private readonly db: Database) {}

  async get(key: string): Promise<string | undefined> {
    const [row] = await this.db.select().from(settings).where(eq(settings.key, key));
    return row?.value;
  }

  async set(key: string, value: string): Promise<void> {
    await this.db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}
