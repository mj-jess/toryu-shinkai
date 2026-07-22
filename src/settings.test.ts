import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from './database.js';
import { SettingsRepository } from './settings.js';

describe('SettingsRepository', () => {
  let db: Database;
  let settings: SettingsRepository;

  beforeEach(() => {
    db = createDatabase(':memory:');
    settings = new SettingsRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('returns undefined for a missing key', () => {
    expect(settings.get('missing')).toBeUndefined();
  });

  it('stores and reads a value', () => {
    settings.set('channel', '123');
    expect(settings.get('channel')).toBe('123');
  });

  it('overwrites an existing key', () => {
    settings.set('channel', '123');
    settings.set('channel', '456');
    expect(settings.get('channel')).toBe('456');
  });
});
