import {
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Interaction,
  type MessageComponentInteraction,
  type ModalSubmitInteraction,
} from 'discord.js';
import { messages } from '../messages.js';
import { buildAddModal, handleAddModalSubmit } from './add-modal.js';
import type { AuditAction, AuditLog } from './audit-log.js';
import type { BrowseSessions, BrowseState } from './browse-session.js';
import { buildDeactivateConfirmView, buildDetailView } from './detail-view.js';
import { buildDueView } from './due-view.js';
import { buildEditModal, handleEditModalSubmit } from './edit-modal.js';
import { formatDateBR, getTodayISO } from './format.js';
import { enrollmentId, parseEnrollmentId } from './ids.js';
import { buildListView } from './list-view.js';
import type { EnrollmentRepository } from './repository.js';

const FILTER_FIELD_ID = 'term';
const FILTER_MAX_LENGTH = 30;

export interface BrowseContext {
  repository: EnrollmentRepository;
  sessions: BrowseSessions;
  audit: AuditLog;
}

/** Fires an audit event for the record's current state; no-op if it vanished. */
function sendAudit(ctx: BrowseContext, action: AuditAction, passport: string, actor: string): void {
  const enrollment = ctx.repository.findByPassport(passport);
  if (enrollment) void ctx.audit.send({ action, enrollment, actor });
}

function buildFilterModal(currentFilter: string): ModalBuilder {
  const input = new TextInputBuilder()
    .setCustomId(FILTER_FIELD_ID)
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(FILTER_MAX_LENGTH)
    .setPlaceholder(messages.filterModal.termPlaceholder);
  if (currentFilter) input.setValue(currentFilter);

  return new ModalBuilder()
    .setCustomId(enrollmentId('filter-modal'))
    .setTitle(messages.filterModal.title)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(messages.filterModal.termLabel)
        .setDescription(messages.filterModal.termDescription)
        .setTextInputComponent(input),
    );
}

/** Renders the list for `state`, persists the normalized state, and updates the message. */
async function showList(
  interaction: MessageComponentInteraction | ModalSubmitInteraction,
  ctx: BrowseContext,
  state: BrowseState,
): Promise<void> {
  const { payload, state: normalized } = buildListView(ctx.repository, state);
  ctx.sessions.set(interaction.user.id, normalized);

  if (interaction.isModalSubmit()) {
    if (interaction.isFromMessage()) await interaction.update(payload);
    else await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.update(payload);
}

/** Renders the renewals list for `state`, persists it, and updates the message. */
async function showDue(
  interaction: MessageComponentInteraction,
  ctx: BrowseContext,
  state: BrowseState,
): Promise<void> {
  const { payload, state: normalized } = buildDueView(ctx.repository, state);
  ctx.sessions.set(interaction.user.id, normalized);
  await interaction.update(payload);
}

/** Re-renders whichever list the session is on (browse or renewals). */
async function showCurrent(
  interaction: MessageComponentInteraction,
  ctx: BrowseContext,
  state: BrowseState,
): Promise<void> {
  if (state.view === 'due') await showDue(interaction, ctx, state);
  else await showList(interaction, ctx, state);
}

/** Updates the message with the record card, falling back to the list if the record vanished. */
async function showDetail(
  interaction: MessageComponentInteraction,
  ctx: BrowseContext,
  passport: string,
  note?: string,
): Promise<void> {
  const enrollment = ctx.repository.findByPassport(passport);
  if (!enrollment) {
    await showList(interaction, ctx, ctx.sessions.get(interaction.user.id));
    return;
  }
  await interaction.update(buildDetailView(enrollment, note));
}

/**
 * Routes every `enrollment:*` interaction (panel buttons, browser navigation,
 * record actions, and modal submits). Returns false when the ID is not ours.
 */
export async function handleEnrollmentInteraction(
  interaction: Interaction,
  ctx: BrowseContext,
): Promise<boolean> {
  const customId =
    interaction.isMessageComponent() || interaction.isModalSubmit() ? interaction.customId : null;
  if (!customId) return false;

  const parsed = parseEnrollmentId(customId);
  if (!parsed) return false;
  const { action, passport } = parsed;

  if (interaction.isButton()) {
    const state = ctx.sessions.get(interaction.user.id);

    switch (action) {
      case 'add':
        await interaction.showModal(buildAddModal());
        return true;
      case 'browse': {
        const { payload, state: normalized } = buildListView(ctx.repository, {
          ...state,
          view: 'browse',
          page: 0,
          filter: '',
        });
        ctx.sessions.set(interaction.user.id, normalized);
        await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
        return true;
      }
      case 'due': {
        // Always opens on the default period (1 month).
        const { payload, state: normalized } = buildDueView(ctx.repository, {
          ...state,
          view: 'due',
          page: 0,
          period: '1m',
        });
        ctx.sessions.set(interaction.user.id, normalized);
        await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
        return true;
      }
      case 'due-period': {
        const period = passport;
        if (period !== '2w' && period !== '1m') return false;
        await showDue(interaction, ctx, { ...state, view: 'due', page: 0, period });
        return true;
      }
      case 'prev':
        await showCurrent(interaction, ctx, { ...state, page: state.page - 1 });
        return true;
      case 'next':
        await showCurrent(interaction, ctx, { ...state, page: state.page + 1 });
        return true;
      case 'filter':
        await interaction.showModal(buildFilterModal(state.filter));
        return true;
      case 'clear-filter':
        await showList(interaction, ctx, { ...state, view: 'browse', page: 0, filter: '' });
        return true;
      case 'back':
        await showCurrent(interaction, ctx, state);
        return true;
      case 'view':
        await showDetail(interaction, ctx, passport);
        return true;
      case 'edit': {
        const enrollment = ctx.repository.findByPassport(passport);
        if (!enrollment) {
          await showList(interaction, ctx, state);
          return true;
        }
        await interaction.showModal(buildEditModal(enrollment));
        return true;
      }
      case 'deact': {
        const enrollment = ctx.repository.findByPassport(passport);
        if (!enrollment) {
          await showList(interaction, ctx, state);
          return true;
        }
        await interaction.update(buildDeactivateConfirmView(enrollment));
        return true;
      }
      case 'deact-yes':
        ctx.repository.deactivate(passport, interaction.user.tag);
        sendAudit(ctx, 'deactivated', passport, interaction.user.toString());
        await showDetail(interaction, ctx, passport, messages.detailView.deactivatedNote);
        return true;
      case 'react':
        ctx.repository.activate(passport);
        sendAudit(ctx, 'reactivated', passport, interaction.user.toString());
        await showDetail(interaction, ctx, passport, messages.detailView.reactivatedNote);
        return true;
      case 'renew': {
        const enrollment = ctx.repository.findByPassport(passport);
        if (!enrollment) {
          await showCurrent(interaction, ctx, state);
          return true;
        }
        const today = getTodayISO();
        if (enrollment.enrolledAt === today) {
          await showDetail(interaction, ctx, passport, messages.detailView.renewedAlreadyNote);
          return true;
        }
        ctx.repository.update({ passport, enrolledAt: today });
        const renewed = ctx.repository.findByPassport(passport);
        if (renewed) {
          void ctx.audit.send({
            action: 'renewed',
            enrollment: renewed,
            actor: interaction.user.toString(),
            changes: [
              {
                label: messages.addModal.fields.enrolledAt,
                before: formatDateBR(enrollment.enrolledAt),
                after: formatDateBR(today),
              },
            ],
          });
        }
        await showDetail(interaction, ctx, passport, messages.detailView.renewedNote);
        return true;
      }
    }
    return false;
  }

  if (interaction.isStringSelectMenu() && action === 'pick') {
    const [selected] = interaction.values;
    if (selected) await showDetail(interaction, ctx, selected);
    return true;
  }

  if (interaction.isModalSubmit()) {
    switch (action) {
      case 'add-modal':
        await handleAddModalSubmit(interaction, ctx.repository, ctx.audit);
        return true;
      case 'filter-modal': {
        const filter = interaction.fields.getTextInputValue(FILTER_FIELD_ID).trim();
        const state = ctx.sessions.get(interaction.user.id);
        await showList(interaction, ctx, { ...state, view: 'browse', page: 0, filter });
        return true;
      }
      case 'edit-modal':
        await handleEditModalSubmit(interaction, passport, ctx.repository, ctx.audit);
        return true;
    }
  }

  return false;
}
