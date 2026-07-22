import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type MessageCreateOptions,
} from 'discord.js';
import { messages } from '../messages.js';
import { enrollmentId } from './ids.js';

export const SETUP_COMMAND_NAME = 'academia-setup';

const PANEL_COLOR = 0x2ecc71;

/** The fixed message pinned to the #matricula channel: embed + the two entry points. */
export function buildPanelMessage(): MessageCreateOptions {
  const embed = new EmbedBuilder()
    .setColor(PANEL_COLOR)
    .setTitle(messages.panel.title)
    .setDescription(messages.panel.description);

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(enrollmentId('add'))
      .setLabel(messages.panel.buttons.add)
      .setEmoji('💪')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(enrollmentId('browse'))
      .setLabel(messages.panel.buttons.browse)
      .setEmoji('📋')
      .setStyle(ButtonStyle.Primary),
  );

  return { embeds: [embed], components: [buttons] };
}
