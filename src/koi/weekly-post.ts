import type { Client } from 'discord.js';
import { messages } from '../messages.js';
import type { SettingsRepository } from '../settings.js';
import { KOI_PANEL_CHANNEL_SETTING_KEY } from './panel.js';
import type { KoiSalesRepository } from './sales-repository.js';
import { buildSummaryEmbed } from './summary-view.js';
import { previousWeekRange, weekKey } from './week.js';

/** Monday morning, local time. */
export const WEEKLY_POST_WEEKDAY = 1;
export const WEEKLY_POST_HOUR = 9;
export const WEEKLY_POST_SETTING_KEY = 'koi.weekly_post.last_week';

/** How often the bot checks whether the weekly post is due. */
export const WEEKLY_CHECK_INTERVAL_MS = 10 * 60 * 1000;

/**
 * True once the chosen weekday/hour has arrived and the week that just ended
 * has not been posted yet — restart-safe, because the marker lives in settings.
 */
export function isWeeklyPostDue(now: Date, lastPostedKey: string | null): boolean {
  if (now.getDay() !== WEEKLY_POST_WEEKDAY) return false;
  if (now.getHours() < WEEKLY_POST_HOUR) return false;
  return lastPostedKey !== weekKey(previousWeekRange(now));
}

export interface WeeklyPostContext {
  client: Client;
  settings: SettingsRepository;
  sales: KoiSalesRepository;
}

/** Posts last week's summary in the KOI panel channel, at most once per week. */
export async function runWeeklyPost(ctx: WeeklyPostContext, now = new Date()): Promise<boolean> {
  const lastPosted = await ctx.settings.get(WEEKLY_POST_SETTING_KEY);
  if (!isWeeklyPostDue(now, lastPosted ?? null)) return false;

  const range = previousWeekRange(now);
  const channelId = await ctx.settings.get(KOI_PANEL_CHANNEL_SETTING_KEY);
  if (!channelId) return false;

  const channel = await ctx.client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isSendable()) return false;

  const sales = await ctx.sales.listBetween(range.fromIso, range.toIso);
  const embed = buildSummaryEmbed(messages.koiSummary.weeklyTitle, range, sales, {
    showSellers: true,
  });
  await channel.send({ embeds: [embed] });
  await ctx.settings.set(WEEKLY_POST_SETTING_KEY, weekKey(range));
  return true;
}

/** Starts the periodic check; the bot keeps it running for its whole life. */
export function startWeeklyPostSchedule(ctx: WeeklyPostContext): NodeJS.Timeout {
  const tick = () => {
    runWeeklyPost(ctx).catch((error: unknown) => {
      console.error('Failed to run the KOI weekly post:', error);
    });
  };
  tick();
  return setInterval(tick, WEEKLY_CHECK_INTERVAL_MS);
}
