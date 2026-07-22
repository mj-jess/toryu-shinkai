import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type MessageCreateOptions,
} from 'discord.js';
import { messages } from '../messages.js';

export const SETUP_COMMAND_NAME = 'academia-setup';

export const PANEL_BUTTON_IDS = {
  add: 'enrollment:add',
  edit: 'enrollment:edit',
  search: 'enrollment:search',
  deactivate: 'enrollment:deactivate',
} as const;

const PANEL_COLOR = 0x2ecc71;

/** The fixed message pinned to the #matricula channel: embed + action buttons. */
export function buildPanelMessage(): MessageCreateOptions {
  const embed = new EmbedBuilder()
    .setColor(PANEL_COLOR)
    .setTitle(messages.panel.title)
    .setDescription(messages.panel.description);

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(PANEL_BUTTON_IDS.add)
      .setLabel(messages.panel.buttons.add)
      .setEmoji('💪')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(PANEL_BUTTON_IDS.edit)
      .setLabel(messages.panel.buttons.edit)
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(PANEL_BUTTON_IDS.search)
      .setLabel(messages.panel.buttons.search)
      .setEmoji('🔍')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(PANEL_BUTTON_IDS.deactivate)
      .setLabel(messages.panel.buttons.deactivate)
      .setEmoji('💤')
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [buttons] };
}
