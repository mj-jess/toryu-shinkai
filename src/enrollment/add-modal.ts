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
import { formatDateBR, formatPhoneNumber, getTodayBR, parseDateBR } from './format.js';
import type { EnrollmentRepository } from './repository.js';
import { GYMS, isGym } from './types.js';

export const ADD_MODAL_ID = 'enrollment:add-modal';

const FIELD_IDS = {
  passport: 'passport',
  name: 'name',
  phone: 'phone',
  gym: 'gym',
  enrolledAt: 'enrolledAt',
} as const;

const GYM_EMOJIS = { sandy: '🏜️', vinewood: '🎬', both: '🏋️' } as const;
const DEFAULT_GYM = 'both';
const SUCCESS_COLOR = 0x2ecc71;

/** The enrollment form, opened by the ➕ button. */
export function buildAddModal(): ModalBuilder {
  const gymOptions = GYMS.map((gym) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(gymLabels[gym])
      .setValue(gym)
      .setEmoji(GYM_EMOJIS[gym])
      .setDefault(gym === DEFAULT_GYM),
  );

  return new ModalBuilder()
    .setCustomId(ADD_MODAL_ID)
    .setTitle(messages.addModal.title)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(messages.addModal.passportLabel)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(FIELD_IDS.passport)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(20)
            .setPlaceholder(messages.addModal.passportPlaceholder),
        ),
      new LabelBuilder()
        .setLabel(messages.addModal.nameLabel)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(FIELD_IDS.name)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80)
            .setPlaceholder(messages.addModal.namePlaceholder),
        ),
      new LabelBuilder()
        .setLabel(messages.addModal.phoneLabel)
        .setDescription(messages.addModal.phoneDescription)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(FIELD_IDS.phone)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(15)
            .setPlaceholder(messages.addModal.phonePlaceholder),
        ),
      new LabelBuilder()
        .setLabel(messages.addModal.gymLabel)
        .setStringSelectMenuComponent(
          new StringSelectMenuBuilder().setCustomId(FIELD_IDS.gym).addOptions(gymOptions),
        ),
      new LabelBuilder()
        .setLabel(messages.addModal.dateLabel)
        .setDescription(messages.addModal.dateDescription)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(FIELD_IDS.enrolledAt)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(10)
            .setValue(getTodayBR()),
        ),
    );
}

/** Validates the submitted form and creates (or reactivates) the enrollment. */
export async function handleAddModalSubmit(
  interaction: ModalSubmitInteraction,
  repository: EnrollmentRepository,
): Promise<void> {
  const passport = interaction.fields.getTextInputValue(FIELD_IDS.passport).trim();
  const name = interaction.fields.getTextInputValue(FIELD_IDS.name).trim();
  const [gym] = interaction.fields.getStringSelectValues(FIELD_IDS.gym);

  if (!gym || !isGym(gym)) {
    await interaction.reply({
      content: messages.common.unexpectedError,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const phone = formatPhoneNumber(interaction.fields.getTextInputValue(FIELD_IDS.phone));
  if (!phone) {
    await interaction.reply({
      content: messages.addModal.invalidPhone,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Phones are unique: allow only when the number belongs to this same passport.
  const phoneOwner = repository.findByPhone(phone);
  if (phoneOwner && phoneOwner.passport !== passport) {
    await interaction.reply({
      content: messages.addModal.phoneInUse(phone, phoneOwner.passport, phoneOwner.name),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const enrolledAt = parseDateBR(interaction.fields.getTextInputValue(FIELD_IDS.enrolledAt));
  if (!enrolledAt) {
    await interaction.reply({
      content: messages.addModal.invalidDate(getTodayBR()),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const existing = repository.findByPassport(passport);
  if (existing?.active) {
    await interaction.reply({
      content: messages.addModal.alreadyEnrolled(
        passport,
        existing.name,
        gymLabels[existing.gym],
        formatDateBR(existing.enrolledAt),
      ),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const input = {
    passport,
    name,
    phone,
    gym,
    enrolledAt,
    registeredBy: interaction.user.tag,
  };

  let title: string;
  if (existing) {
    repository.reactivate(input);
    title = messages.addModal.reactivatedTitle;
  } else {
    repository.insert(input);
    title = messages.addModal.createdTitle;
  }

  const embed = new EmbedBuilder()
    .setColor(SUCCESS_COLOR)
    .setTitle(title)
    .addFields(
      { name: messages.addModal.fields.passport, value: passport, inline: true },
      { name: messages.addModal.fields.name, value: name, inline: true },
      { name: messages.addModal.fields.phone, value: phone, inline: true },
      { name: messages.addModal.fields.gym, value: gymLabels[gym], inline: true },
      { name: messages.addModal.fields.enrolledAt, value: formatDateBR(enrolledAt), inline: true },
      {
        name: messages.addModal.fields.registeredBy,
        value: interaction.user.toString(),
        inline: true,
      },
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
