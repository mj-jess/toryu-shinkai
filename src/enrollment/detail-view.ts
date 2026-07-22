import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type APIEmbedField,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { gymLabels, messages } from '../messages.js';
import { EMBED_COLOR, timestampToDateBR } from './display.js';
import { formatDateBR } from './format.js';
import { enrollmentId } from './ids.js';
import type { Enrollment } from './types.js';

interface ViewPayload {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}

/**
 * The record card: full labeled data plus the available actions.
 * `note` renders highlighted at the top (e.g. "matrícula atualizada").
 */
export function buildDetailView(enrollment: Enrollment, note?: string): ViewPayload {
  const labels = messages.addModal.fields;
  const detail = messages.detailView;

  const fields: APIEmbedField[] = [
    { name: labels.phone, value: enrollment.phone, inline: true },
    { name: labels.gym, value: gymLabels[enrollment.gym], inline: true },
    { name: labels.enrolledAt, value: formatDateBR(enrollment.enrolledAt), inline: true },
    {
      name: detail.statusLabel,
      value: enrollment.active ? detail.statusActive : detail.statusInactive,
      inline: true,
    },
  ];

  if (!enrollment.active && enrollment.deactivatedBy) {
    fields.push({
      name: detail.deactivatedByLabel,
      value: detail.deactivationInfo(
        enrollment.deactivatedBy,
        timestampToDateBR(enrollment.deactivatedAt),
      ),
      inline: true,
    });
  }

  if (enrollment.registeredBy) {
    fields.push({ name: labels.registeredBy, value: enrollment.registeredBy, inline: true });
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(detail.title(enrollment.passport, enrollment.name))
    .addFields(fields);

  if (note) embed.setDescription(note);

  const buttons = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(enrollmentId('edit', enrollment.passport))
      .setLabel(detail.buttons.edit)
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Primary),
    enrollment.active
      ? new ButtonBuilder()
          .setCustomId(enrollmentId('deact', enrollment.passport))
          .setLabel(detail.buttons.deactivate)
          .setEmoji('💤')
          .setStyle(ButtonStyle.Danger)
      : new ButtonBuilder()
          .setCustomId(enrollmentId('react', enrollment.passport))
          .setLabel(detail.buttons.reactivate)
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(enrollmentId('back'))
      .setLabel(detail.buttons.back)
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [buttons] };
}

/** Asks for confirmation before deactivating. */
export function buildDeactivateConfirmView(enrollment: Enrollment): ViewPayload {
  const detail = messages.detailView;

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(detail.title(enrollment.passport, enrollment.name))
    .setDescription(detail.confirmDeactivation(enrollment.name));

  const buttons = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(enrollmentId('deact-yes', enrollment.passport))
      .setLabel(detail.buttons.confirmDeactivation)
      .setEmoji('💤')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(enrollmentId('view', enrollment.passport))
      .setLabel(detail.buttons.cancel)
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [buttons] };
}
