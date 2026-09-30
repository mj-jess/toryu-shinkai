import { describe, expect, it, vi } from 'vitest';
import type { SettingsRepository } from '../settings.js';
import { KOI_WEEKLY_POST_ENABLED_SETTING_KEY } from './types.js';
import { runWeeklyPost, type WeeklyPostContext } from './weekly-post.js';

function context(values: Record<string, string>) {
  const get = vi.fn(async (key: string) => values[key]);
  const settings = { get, set: vi.fn() } as unknown as SettingsRepository;
  const fetch = vi.fn(async () => null);
  const ctx = {
    client: { channels: { fetch } },
    settings,
    sales: { listBetween: vi.fn(async () => []) },
  } as unknown as WeeklyPostContext;
  return { ctx, get, fetch };
}

// 2026-09-28 is a Monday.
const mondayMorning = new Date(2026, 8, 28, 10, 0);
const tuesday = new Date(2026, 8, 29, 10, 0);

describe('runWeeklyPost', () => {
  it('does not touch the database outside the Monday window', async () => {
    const { ctx, get } = context({ [KOI_WEEKLY_POST_ENABLED_SETTING_KEY]: 'true' });
    expect(await runWeeklyPost(ctx, tuesday)).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });

  it('is off by default', async () => {
    const { ctx, get, fetch } = context({});
    expect(await runWeeklyPost(ctx, mondayMorning)).toBe(false);
    expect(get).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stays off when the switch is turned off', async () => {
    const { ctx, fetch } = context({ [KOI_WEEKLY_POST_ENABLED_SETTING_KEY]: 'false' });
    expect(await runWeeklyPost(ctx, mondayMorning)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('goes on to post when enabled', async () => {
    const { ctx, fetch } = context({
      [KOI_WEEKLY_POST_ENABLED_SETTING_KEY]: 'true',
      'koi.panel_channel': '123',
    });
    // The fake channel fetch returns null, so it stops right after trying to post.
    expect(await runWeeklyPost(ctx, mondayMorning)).toBe(false);
    expect(fetch).toHaveBeenCalledWith('123');
  });
});
