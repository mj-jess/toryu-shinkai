import {
  EmbedBuilder,
  type InteractionReplyOptions,
  type ModalSubmitInteraction,
} from 'discord.js';
import { vi, type Mock } from 'vitest';

interface FakeModalFields {
  text?: Record<string, string>;
  selects?: Record<string, string[]>;
}

/** Builds a minimal ModalSubmitInteraction double for handler tests. */
export function fakeModalInteraction(fields: FakeModalFields = {}): ModalSubmitInteraction {
  return {
    fields: {
      getTextInputValue: (id: string) => fields.text?.[id] ?? '',
      getStringSelectValues: (id: string) => fields.selects?.[id] ?? [],
    },
    user: { tag: 'tester#0', toString: () => '<@42>' },
    reply: vi.fn().mockResolvedValue(undefined),
  } as unknown as ModalSubmitInteraction;
}

/** The options object passed to `interaction.reply`. */
export function replyArg(interaction: ModalSubmitInteraction): InteractionReplyOptions {
  return (interaction.reply as Mock).mock.calls[0]?.[0] as InteractionReplyOptions;
}

export function replyEmbed(reply: InteractionReplyOptions): EmbedBuilder | undefined {
  const [embed] = reply.embeds ?? [];
  return embed instanceof EmbedBuilder ? embed : undefined;
}

export function embedTitle(reply: InteractionReplyOptions): string | undefined {
  return replyEmbed(reply)?.data.title;
}

export function embedFieldValue(reply: InteractionReplyOptions, name: string): string | undefined {
  return replyEmbed(reply)?.data.fields?.find((field) => field.name === name)?.value;
}
