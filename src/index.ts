import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { getDefaultDatabase } from './database.js';
import { handleEnrollmentInteraction, type BrowseContext } from './enrollment/browse-handlers.js';
import { BrowseSessions } from './enrollment/browse-session.js';
import { buildPanelMessage, SETUP_COMMAND_NAME } from './enrollment/panel.js';
import { EnrollmentRepository } from './enrollment/repository.js';
import { requireEnv } from './env.js';
import { messages } from './messages.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const ctx: BrowseContext = {
  repository: new EnrollmentRepository(getDefaultDatabase()),
  sessions: new BrowseSessions(),
};

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot online as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // /academia-setup — publishes the fixed panel message in the current channel
    if (interaction.isChatInputCommand() && interaction.commandName === SETUP_COMMAND_NAME) {
      if (!interaction.channel?.isSendable()) {
        await interaction.reply({
          content: messages.setup.channelNotSendable,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await interaction.channel.send(buildPanelMessage());
      await interaction.reply({
        content: messages.setup.panelPublished,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await handleEnrollmentInteraction(interaction, ctx);
  } catch (error) {
    console.error('Failed to handle interaction:', error);
    const reply = {
      content: messages.common.unexpectedError,
      flags: MessageFlags.Ephemeral,
    } as const;
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  }
});

void client.login(requireEnv('DISCORD_TOKEN'));
