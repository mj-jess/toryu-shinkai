import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type MessageCreateOptions,
} from 'discord.js';
import { messages } from '../messages.js';
import { koiId } from './ids.js';

export const KOI_SETUP_COMMAND_NAME = 'koi-setup';
export const KOI_LOG_SETUP_COMMAND_NAME = 'koi-log-setup';

/** Where the panel lives — the weekly summary is posted in the same channel. */
export const KOI_PANEL_CHANNEL_SETTING_KEY = 'koi.panel_channel';
export const KOI_LOG_CHANNEL_SETTING_KEY = 'koi.log_channel';

export const KOI_COLOR = 0xe8622c;

/** The fixed message pinned to the #koi channel. */
export function buildKoiPanelMessage(): MessageCreateOptions {
  const embed = new EmbedBuilder()
    .setColor(KOI_COLOR)
    .setTitle(messages.koiPanel.title)
    .setDescription(messages.koiPanel.description);

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(koiId('sale'))
      .setLabel(messages.koiPanel.buttons.sale)
      .setEmoji('💰')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(koiId('week'))
      .setLabel(messages.koiPanel.buttons.week)
      .setEmoji('📊')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(koiId('mine'))
      .setLabel(messages.koiPanel.buttons.mine)
      .setEmoji('🧾')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [buttons] };
}
