import {
  EmbedBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
} from 'discord.js';
import { messages } from '../messages.js';
import { EMBED_COLOR, enrollmentFields } from './display.js';
import type { EnrollmentRepository } from './repository.js';

export const DEACTIVATE_MODAL_ID = 'enrollment:deactivate-modal';

const PASSPORT_FIELD_ID = 'passport';

/** The deactivation form, opened by the 💤 button. */
export function buildDeactivateModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(DEACTIVATE_MODAL_ID)
    .setTitle(messages.deactivateModal.title)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(messages.deactivateModal.passportLabel)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(PASSPORT_FIELD_ID)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(20)
            .setPlaceholder(messages.deactivateModal.passportPlaceholder),
        ),
    );
}

/** Marks an enrollment as inactive (never deletes), recording who did it. */
export async function handleDeactivateModalSubmit(
  interaction: ModalSubmitInteraction,
  repository: EnrollmentRepository,
): Promise<void> {
  const passport = interaction.fields.getTextInputValue(PASSPORT_FIELD_ID).trim();

  const enrollment = repository.findByPassport(passport);
  if (!enrollment) {
    await interaction.reply({
      content: messages.deactivateModal.notFound(passport),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!enrollment.active) {
    await interaction.reply({
      content: messages.deactivateModal.alreadyInactive(enrollment.name),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  repository.deactivate(passport, interaction.user.tag);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(messages.deactivateModal.deactivatedTitle)
    .setDescription(messages.deactivateModal.deactivatedNote)
    .addFields(...enrollmentFields(enrollment), {
      name: messages.deactivateModal.deactivatedBy,
      value: interaction.user.toString(),
      inline: true,
    });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
