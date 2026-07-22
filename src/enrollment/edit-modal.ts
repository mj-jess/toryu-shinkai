import {
  EmbedBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
} from 'discord.js';
import { gymLabels, messages } from '../messages.js';
import { EMBED_COLOR, enrollmentFields } from './display.js';
import { formatPhoneNumber, getTodayBR, parseDateBR } from './format.js';
import type { EnrollmentRepository } from './repository.js';
import { GYMS, isGym, type EnrollmentUpdate } from './types.js';

export const EDIT_MODAL_ID = 'enrollment:edit-modal';

const FIELD_IDS = {
  passport: 'passport',
  name: 'name',
  phone: 'phone',
  gym: 'gym',
  enrolledAt: 'enrolledAt',
} as const;

/** Sentinel select value meaning "keep the current gym". */
const KEEP_GYM = 'keep';

/** The edit form, opened by the ✏️ button. Blank fields keep their current value. */
export function buildEditModal(): ModalBuilder {
  const gymOptions = [
    new StringSelectMenuOptionBuilder()
      .setLabel(messages.editModal.keepGymOption)
      .setValue(KEEP_GYM)
      .setDefault(true),
    ...GYMS.map((gym) =>
      new StringSelectMenuOptionBuilder().setLabel(gymLabels[gym]).setValue(gym),
    ),
  ];

  return new ModalBuilder()
    .setCustomId(EDIT_MODAL_ID)
    .setTitle(messages.editModal.title)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(messages.editModal.passportLabel)
        .setDescription(messages.editModal.passportDescription)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(FIELD_IDS.passport)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(20),
        ),
      new LabelBuilder()
        .setLabel(messages.editModal.nameLabel)
        .setDescription(messages.editModal.optionalHint)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(FIELD_IDS.name)
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(80),
        ),
      new LabelBuilder()
        .setLabel(messages.editModal.phoneLabel)
        .setDescription(messages.editModal.optionalHint)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(FIELD_IDS.phone)
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(15)
            .setPlaceholder(messages.addModal.phonePlaceholder),
        ),
      new LabelBuilder()
        .setLabel(messages.editModal.gymLabel)
        .setStringSelectMenuComponent(
          new StringSelectMenuBuilder().setCustomId(FIELD_IDS.gym).addOptions(gymOptions),
        ),
      new LabelBuilder()
        .setLabel(messages.editModal.dateLabel)
        .setDescription(messages.editModal.optionalHint)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(FIELD_IDS.enrolledAt)
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(10)
            .setPlaceholder(messages.addModal.dateDescription),
        ),
    );
}

/** Applies the provided changes to an existing enrollment; blank fields are kept as-is. */
export async function handleEditModalSubmit(
  interaction: ModalSubmitInteraction,
  repository: EnrollmentRepository,
): Promise<void> {
  const passport = interaction.fields.getTextInputValue(FIELD_IDS.passport).trim();

  const existing = repository.findByPassport(passport);
  if (!existing) {
    await interaction.reply({
      content: messages.editModal.notFound(passport),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const changes: EnrollmentUpdate = { passport };
  const changedLabels: string[] = [];
  const labels = messages.addModal.fields;

  const name = interaction.fields.getTextInputValue(FIELD_IDS.name).trim();
  if (name) {
    changes.name = name;
    changedLabels.push(labels.name);
  }

  const rawPhone = interaction.fields.getTextInputValue(FIELD_IDS.phone).trim();
  if (rawPhone) {
    const phone = formatPhoneNumber(rawPhone);
    if (!phone) {
      await interaction.reply({
        content: messages.addModal.invalidPhone,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    changes.phone = phone;
    changedLabels.push(labels.phone);
  }

  const [gym = KEEP_GYM] = interaction.fields.getStringSelectValues(FIELD_IDS.gym);
  if (gym !== KEEP_GYM && isGym(gym) && gym !== existing.gym) {
    changes.gym = gym;
    changedLabels.push(labels.gym);
  }

  const rawDate = interaction.fields.getTextInputValue(FIELD_IDS.enrolledAt).trim();
  if (rawDate) {
    const enrolledAt = parseDateBR(rawDate);
    if (!enrolledAt) {
      await interaction.reply({
        content: messages.addModal.invalidDate(getTodayBR()),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    changes.enrolledAt = enrolledAt;
    changedLabels.push(labels.enrolledAt);
  }

  if (changedLabels.length === 0) {
    await interaction.reply({
      content: messages.editModal.nothingToChange,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  repository.update(changes);
  const updated = repository.findByPassport(passport) ?? existing;

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(messages.editModal.updatedTitle)
    .addFields(...enrollmentFields(updated), {
      name: messages.editModal.changedFieldsLabel,
      value: changedLabels.join(', '),
      inline: true,
    });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
