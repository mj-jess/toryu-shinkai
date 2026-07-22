import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { getDefaultDatabase } from './database.js';
import { ADD_MODAL_ID, buildAddModal, handleAddModalSubmit } from './enrollment/add-modal.js';
import { buildPanelMessage, PANEL_BUTTON_IDS, SETUP_COMMAND_NAME } from './enrollment/panel.js';
import { EnrollmentRepository } from './enrollment/repository.js';
import { requireEnv } from './env.js';
import { messages } from './messages.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const repository = new EnrollmentRepository(getDefaultDatabase());

const PENDING_BUTTON_IDS: readonly string[] = [
  PANEL_BUTTON_IDS.edit,
  PANEL_BUTTON_IDS.search,
  PANEL_BUTTON_IDS.deactivate,
];

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

    if (interaction.isButton()) {
      if (interaction.customId === PANEL_BUTTON_IDS.add) {
        await interaction.showModal(buildAddModal());
        return;
      }
      if (PENDING_BUTTON_IDS.includes(interaction.customId)) {
        await interaction.reply({
          content: messages.common.underDevelopment,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    if (interaction.isModalSubmit() && interaction.customId === ADD_MODAL_ID) {
      await handleAddModalSubmit(interaction, repository);
    }
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
