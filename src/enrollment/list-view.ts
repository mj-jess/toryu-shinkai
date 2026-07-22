import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ActionRowBuilder as ActionRow,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { gymLabels, messages } from '../messages.js';
import type { BrowseState } from './browse-session.js';
import { EMBED_COLOR, listEntry } from './display.js';
import { enrollmentId } from './ids.js';
import type { EnrollmentRepository } from './repository.js';

export const PAGE_SIZE = 10;

export interface ListViewResult {
  payload: {
    embeds: EmbedBuilder[];
    components: ActionRow<MessageActionRowComponentBuilder>[];
  };
  /** The state actually rendered (page clamped to the available range). */
  state: BrowseState;
}

/** Builds the paginated enrollment browser for the given state. */
export function buildListView(
  repository: EnrollmentRepository,
  state: BrowseState,
): ListViewResult {
  const probe = repository.list(state.filter, 0, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(probe.total / PAGE_SIZE));
  const page = Math.min(Math.max(state.page, 0), totalPages - 1);
  const normalized: BrowseState = { page, filter: state.filter };

  const { items, total } = page === 0 ? probe : repository.list(state.filter, page, PAGE_SIZE);

  const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle(messages.listView.title);

  if (total === 0) {
    embed.setDescription(
      state.filter ? messages.listView.emptyFiltered(state.filter) : messages.listView.emptyAll,
    );
  } else {
    embed.setDescription(items.map(listEntry).join('\n\n'));
    const footer = [
      messages.listView.footer(page + 1, totalPages, total),
      state.filter ? messages.listView.filterNote(state.filter) : null,
    ]
      .filter(Boolean)
      .join(' · ');
    embed.setFooter({ text: footer });
  }

  const components: ActionRow<MessageActionRowComponentBuilder>[] = [];

  if (items.length > 0) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(enrollmentId('pick'))
      .setPlaceholder(messages.listView.selectPlaceholder)
      .addOptions(
        items.map((enrollment) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${enrollment.passport} — ${enrollment.name}`)
            .setValue(enrollment.passport)
            .setDescription(
              `${messages.listView.entryLine(enrollment.phone, gymLabels[enrollment.gym])}`,
            )
            .setEmoji(enrollment.active ? '✅' : '💤'),
        ),
      );
    components.push(new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(select));
  }

  const buttons: ButtonBuilder[] = [
    new ButtonBuilder()
      .setCustomId(enrollmentId('filter'))
      .setLabel(messages.listView.buttons.filter)
      .setEmoji('🔎')
      .setStyle(ButtonStyle.Primary),
  ];

  if (state.filter) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(enrollmentId('clear-filter'))
        .setLabel(messages.listView.buttons.clearFilter)
        .setEmoji('🧹')
        .setStyle(ButtonStyle.Secondary),
    );
  }

  if (totalPages > 1) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(enrollmentId('prev'))
        .setLabel(messages.listView.buttons.previous)
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(enrollmentId('next'))
        .setLabel(messages.listView.buttons.next)
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages - 1),
    );
  }

  components.push(new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buttons));

  return { payload: { embeds: [embed], components }, state: normalized };
}
