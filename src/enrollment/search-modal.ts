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
import { EMBED_COLOR, enrollmentSummaryLine } from './display.js';
import type { EnrollmentRepository } from './repository.js';

export const SEARCH_MODAL_ID = 'enrollment:search-modal';

const LIST_ALL_TERM = '*';
const TERM_FIELD_ID = 'term';

/** The search form, opened by the 🔍 button. */
export function buildSearchModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(SEARCH_MODAL_ID)
    .setTitle(messages.searchModal.title)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(messages.searchModal.termLabel)
        .setDescription(messages.searchModal.termDescription)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(TERM_FIELD_ID)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80)
            .setPlaceholder(messages.searchModal.termPlaceholder),
        ),
    );
}

/** Searches by passport/name (or lists the most recent for `*`) and replies with the results. */
export async function handleSearchModalSubmit(
  interaction: ModalSubmitInteraction,
  repository: EnrollmentRepository,
): Promise<void> {
  const term = interaction.fields.getTextInputValue(TERM_FIELD_ID).trim();
  const listAll = term === LIST_ALL_TERM;

  const results = listAll ? repository.listRecent(20) : repository.search(term);
  if (results.length === 0) {
    await interaction.reply({
      content: messages.searchModal.noResults(term),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const counts = repository.counts();
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(listAll ? messages.searchModal.recentTitle : messages.searchModal.resultsTitle)
    .addFields(
      results.map((enrollment) => ({
        name: `${enrollment.passport} — ${enrollment.name}`,
        value: enrollmentSummaryLine(enrollment),
      })),
    )
    .setFooter({ text: messages.searchModal.totalsFooter(counts.active, counts.inactive) });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
