import type { Client, EmbedBuilder } from 'discord.js';
import type { SettingsRepository } from '../settings.js';
import { KOI_LOG_CHANNEL_SETTING_KEY } from './panel.js';

/** Posts KOI records to the channel registered with /koi-log-setup. */
export interface KoiLog {
  /** Returns the message URL, or null when no channel is configured. */
  send(embed: EmbedBuilder): Promise<string | null>;
}

export class KoiChannelLog implements KoiLog {
  constructor(
    private readonly client: Client,
    private readonly settings: SettingsRepository,
  ) {}

  async send(embed: EmbedBuilder): Promise<string | null> {
    const channelId = await this.settings.get(KOI_LOG_CHANNEL_SETTING_KEY);
    if (!channelId) return null;

    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isSendable()) return null;

    const message = await channel.send({ embeds: [embed] });
    return message.url;
  }
}
