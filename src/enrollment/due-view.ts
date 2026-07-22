import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { gymLabels, messages } from '../messages.js';
import type { BrowseState, DuePeriod } from './browse-session.js';
import { daysSince, formatDateBR, isoDaysAgo } from './format.js';
import { enrollmentId } from './ids.js';
import { PAGE_SIZE, type ListViewResult } from './list-view.js';
import type { EnrollmentRepository } from './repository.js';
import type { Enrollment } from './types.js';

/** How far back each renewal period reaches ("1 month" is a fixed 30 days). */
export const PERIOD_DAYS: Record<DuePeriod, number> = { '2w': 14, '1m': 30 };

const DUE_COLOR = 0xe67e22;

function dueEntry(enrollment: Enrollment): string {
  return [
    `**${enrollment.passport} — ${enrollment.name}**`,
    messages.dueView.entryLine(
      formatDateBR(enrollment.enrolledAt),
      daysSince(enrollment.enrolledAt),
      gymLabels[enrollment.gym],
    ),
  ].join('\n');
}

function periodButton(period: DuePeriod, active: DuePeriod): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(enrollmentId('due-period', period))
    .setLabel(messages.dueView.periodLabels[period])
    .setEmoji('🗓️')
    .setStyle(period === active ? ButtonStyle.Success : ButtonStyle.Secondary);
}

/**
 * The renewals browser: active enrollments older than the selected period,
 * most overdue first, with the same select → record card navigation.
 */
export function buildDueView(repository: EnrollmentRepository, state: BrowseState): ListViewResult {
  const cutoff = isoDaysAgo(PERIOD_DAYS[state.period]);
  const probe = repository.listDue(cutoff, 0, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(probe.total / PAGE_SIZE));
  const page = Math.min(Math.max(state.page, 0), totalPages - 1);
  const normalized: BrowseState = { ...state, view: 'due', page };

  const { items, total } = page === 0 ? probe : repository.listDue(cutoff, page, PAGE_SIZE);

  const periodLabel = messages.dueView.periodLabels[state.period];
  const embed = new EmbedBuilder().setColor(DUE_COLOR).setTitle(messages.dueView.title);

  if (total === 0) {
    embed.setDescription(messages.dueView.empty(periodLabel));
  } else {
    embed.setDescription(
      [messages.dueView.header(periodLabel), '', items.map(dueEntry).join('\n\n')].join('\n'),
    );
    embed.setFooter({
      text: [
        messages.listView.footer(page + 1, totalPages, total),
        messages.dueView.periodNote(periodLabel),
      ].join(' · '),
    });
  }

  const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      periodButton('2w', state.period),
      periodButton('1m', state.period),
    ),
  ];

  if (items.length > 0) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(enrollmentId('pick'))
      .setPlaceholder(messages.listView.selectPlaceholder)
      .addOptions(
        items.map((enrollment) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${enrollment.passport} — ${enrollment.name}`)
            .setValue(enrollment.passport)
            .setEmoji('🕒'),
        ),
      );
    components.push(new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(select));
  }

  if (totalPages > 1) {
    components.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
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
      ),
    );
  }

  return { payload: { embeds: [embed], components }, state: normalized };
}
