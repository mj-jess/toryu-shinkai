import {
  EmbedBuilder,
  type ButtonInteraction,
  type InteractionReplyOptions,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { vi, type Mock } from 'vitest';
import type { AuditEvent, AuditLog } from './audit-log.js';

type AnyInteraction = ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction;

export const FAKE_AUDIT_LOG_URL = 'https://discord.com/channels/1/2/3';

/** In-memory AuditLog double that records every event; `url` is what send() resolves to. */
export function fakeAuditLog(
  url: string | null = FAKE_AUDIT_LOG_URL,
): AuditLog & { events: AuditEvent[] } {
  const events: AuditEvent[] = [];
  return {
    events,
    send: async (event: AuditEvent) => {
      events.push(event);
      return url;
    },
  };
}

function baseInteraction(customId: string) {
  return {
    customId,
    user: { id: 'user-1', tag: 'tester#0', toString: () => '<@42>' },
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    deferred: false,
    replied: false,
    isRepliable: () => true,
    isChatInputCommand: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isMessageComponent: () => false,
    isModalSubmit: () => false,
  };
}

export function fakeButtonInteraction(customId: string): ButtonInteraction {
  return {
    ...baseInteraction(customId),
    isButton: () => true,
    isMessageComponent: () => true,
  } as unknown as ButtonInteraction;
}

export function fakeSelectInteraction(
  customId: string,
  values: string[],
): StringSelectMenuInteraction {
  return {
    ...baseInteraction(customId),
    values,
    isStringSelectMenu: () => true,
    isMessageComponent: () => true,
  } as unknown as StringSelectMenuInteraction;
}

interface FakeModalOptions {
  customId?: string;
  text?: Record<string, string>;
  selects?: Record<string, string[]>;
  /** Whether the modal was opened from a message (enables `update`). Defaults to true. */
  fromMessage?: boolean;
}

/** Builds a minimal ModalSubmitInteraction double for handler tests. */
export function fakeModalInteraction(options: FakeModalOptions = {}): ModalSubmitInteraction {
  return {
    ...baseInteraction(options.customId ?? ''),
    isModalSubmit: () => true,
    isFromMessage: () => options.fromMessage ?? true,
    fields: {
      getTextInputValue: (id: string) => options.text?.[id] ?? '',
      getStringSelectValues: (id: string) => options.selects?.[id] ?? [],
    },
  } as unknown as ModalSubmitInteraction;
}

/** Accesses a mocked method on a fake interaction, bypassing discord.js narrowed types. */
function mockOf(interaction: AnyInteraction, method: 'reply' | 'update' | 'showModal'): Mock {
  return (interaction as unknown as Record<string, Mock>)[method] as Mock;
}

/** The options object passed to `interaction.reply`. */
export function replyArg(interaction: AnyInteraction): InteractionReplyOptions {
  return mockOf(interaction, 'reply').mock.calls[0]?.[0] as InteractionReplyOptions;
}

/** The options object passed to `interaction.update`. */
export function updateArg(interaction: AnyInteraction): InteractionReplyOptions {
  return mockOf(interaction, 'update').mock.calls.at(-1)?.[0] as InteractionReplyOptions;
}

interface ModalJSON {
  custom_id: string;
  title: string;
  components: ModalComponentJSON[];
}

interface ModalComponentJSON {
  component?: {
    custom_id: string;
    value?: string;
    options?: { value: string; default?: boolean }[];
  };
}

/** The modal builder passed to `interaction.showModal`, serialized. */
export function shownModal(interaction: AnyInteraction): ModalJSON | undefined {
  const modal = mockOf(interaction, 'showModal').mock.calls[0]?.[0] as
    { toJSON(): unknown } | undefined;
  return modal?.toJSON() as ModalJSON | undefined;
}

/** Finds a serialized modal field by its custom ID. */
export function modalField(modal: unknown, customId: string) {
  const components = (modal as { components?: ModalComponentJSON[] } | undefined)?.components ?? [];
  return components.find((label) => label.component?.custom_id === customId)?.component;
}

export function replyEmbed(payload: InteractionReplyOptions): EmbedBuilder | undefined {
  const [embed] = payload.embeds ?? [];
  return embed instanceof EmbedBuilder ? embed : undefined;
}

export function embedTitle(payload: InteractionReplyOptions): string | undefined {
  return replyEmbed(payload)?.data.title;
}

export function embedFieldValue(
  payload: InteractionReplyOptions,
  name: string,
): string | undefined {
  return replyEmbed(payload)?.data.fields?.find((field) => field.name === name)?.value;
}
