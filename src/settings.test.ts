import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from './db/test-database.js';
import { SettingsRepository } from './settings.js';

describe('SettingsRepository', () => {
  let testDb: TestDatabase;
  let settings: SettingsRepository;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    settings = new SettingsRepository(testDb.db);
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
  });

  it('returns undefined for a missing key', async () => {
    expect(await settings.get('missing')).toBeUndefined();
  });

  it('stores and reads a value', async () => {
    await settings.set('channel', '123');
    expect(await settings.get('channel')).toBe('123');
  });

  it('overwrites an existing key', async () => {
    await settings.set('channel', '123');
    await settings.set('channel', '456');
    expect(await settings.get('channel')).toBe('456');
  });
});
