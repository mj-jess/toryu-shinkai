import {
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
import type { AuditChange, AuditLog } from './audit-log.js';
import { buildDetailView } from './detail-view.js';
import { formatDateBR, formatPhoneNumber, getTodayBR, parseDateBR } from './format.js';
import { enrollmentId } from './ids.js';
import type { EnrollmentRepository } from './repository.js';
import { GYMS, isGym, type Enrollment, type EnrollmentUpdate } from './types.js';

const FIELD_IDS = {
  name: 'name',
  phone: 'phone',
  gym: 'gym',
  enrolledAt: 'enrolledAt',
} as const;

/** The edit form, opened from the record card — every field pre-filled with current data. */
export function buildEditModal(enrollment: Enrollment): ModalBuilder {
  const gymOptions = GYMS.map((gym) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(gymLabels[gym])
      .setValue(gym)
      .setDefault(gym === enrollment.gym),
  );

  return new ModalBuilder()
    .setCustomId(enrollmentId('edit-modal', enrollment.passport))
    .setTitle(messages.editModal.title(enrollment.passport))
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(messages.addModal.nameLabel)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(FIELD_IDS.name)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80)
            .setValue(enrollment.name),
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
            .setValue(enrollment.phone),
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
            .setValue(formatDateBR(enrollment.enrolledAt)),
        ),
    );
}

/** Validates the submitted edit and refreshes the record card in place. */
export async function handleEditModalSubmit(
  interaction: ModalSubmitInteraction,
  passport: string,
  repository: EnrollmentRepository,
  audit: AuditLog,
): Promise<void> {
  const existing = await repository.findByPassport(passport);
  if (!existing) {
    await interaction.reply({
      content: messages.detailView.notFound,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const name = interaction.fields.getTextInputValue(FIELD_IDS.name).trim();

  const phone = formatPhoneNumber(interaction.fields.getTextInputValue(FIELD_IDS.phone));
  if (!phone) {
    await interaction.reply({
      content: messages.addModal.invalidPhone,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const phoneOwner = await repository.findByPhone(phone);
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

  const [rawGym] = interaction.fields.getStringSelectValues(FIELD_IDS.gym);
  const gym = rawGym !== undefined && isGym(rawGym) ? rawGym : existing.gym;

  const labels = messages.addModal.fields;
  const changed: AuditChange[] = [];
  const changes: EnrollmentUpdate = { passport };

  if (name && name !== existing.name) {
    changes.name = name;
    changed.push({ label: labels.name, before: existing.name, after: name });
  }
  if (phone !== existing.phone) {
    changes.phone = phone;
    changed.push({ label: labels.phone, before: existing.phone, after: phone });
  }
  if (gym !== existing.gym) {
    changes.gym = gym;
    changed.push({ label: labels.gym, before: gymLabels[existing.gym], after: gymLabels[gym] });
  }
  if (enrolledAt !== existing.enrolledAt) {
    changes.enrolledAt = enrolledAt;
    changed.push({
      label: labels.enrolledAt,
      before: formatDateBR(existing.enrolledAt),
      after: formatDateBR(enrolledAt),
    });
  }

  const changedLabels = changed.map((change) => change.label);
  const note =
    changedLabels.length === 0
      ? messages.editModal.nothingToChange
      : `${messages.detailView.updatedNote}\n${messages.editModal.changedFieldsLabel}: ${changedLabels.join(', ')}`;

  if (changed.length > 0) await repository.update(changes);
  const updated = (await repository.findByPassport(passport)) ?? existing;

  if (changed.length > 0) {
    void audit.send({
      action: 'updated',
      enrollment: updated,
      actor: interaction.user.toString(),
      changes: changed,
    });
  }

  const view = buildDetailView(updated, note);
  if (interaction.isFromMessage()) {
    await interaction.update(view);
  } else {
    await interaction.reply({ ...view, flags: MessageFlags.Ephemeral });
  }
}
