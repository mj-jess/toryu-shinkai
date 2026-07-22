import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  type ModalBuilder,
  type ModalSubmitInteraction,
} from 'discord.js';
import { getDefaultDatabase } from './database.js';
import { ADD_MODAL_ID, buildAddModal, handleAddModalSubmit } from './enrollment/add-modal.js';
import {
  DEACTIVATE_MODAL_ID,
  buildDeactivateModal,
  handleDeactivateModalSubmit,
} from './enrollment/deactivate-modal.js';
import { EDIT_MODAL_ID, buildEditModal, handleEditModalSubmit } from './enrollment/edit-modal.js';
import { buildPanelMessage, PANEL_BUTTON_IDS, SETUP_COMMAND_NAME } from './enrollment/panel.js';
import { EnrollmentRepository } from './enrollment/repository.js';
import {
  SEARCH_MODAL_ID,
  buildSearchModal,
  handleSearchModalSubmit,
} from './enrollment/search-modal.js';
import { requireEnv } from './env.js';
import { messages } from './messages.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const repository = new EnrollmentRepository(getDefaultDatabase());

/** Panel button → modal it opens. */
const modalBuilders: Record<string, () => ModalBuilder> = {
  [PANEL_BUTTON_IDS.add]: buildAddModal,
  [PANEL_BUTTON_IDS.edit]: buildEditModal,
  [PANEL_BUTTON_IDS.search]: buildSearchModal,
  [PANEL_BUTTON_IDS.deactivate]: buildDeactivateModal,
};

/** Modal custom ID → submit handler. */
const modalHandlers: Record<
  string,
  (interaction: ModalSubmitInteraction, repository: EnrollmentRepository) => Promise<void>
> = {
  [ADD_MODAL_ID]: handleAddModalSubmit,
  [EDIT_MODAL_ID]: handleEditModalSubmit,
  [SEARCH_MODAL_ID]: handleSearchModalSubmit,
  [DEACTIVATE_MODAL_ID]: handleDeactivateModalSubmit,
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

    if (interaction.isButton()) {
      const buildModal = modalBuilders[interaction.customId];
      if (buildModal) await interaction.showModal(buildModal());
      return;
    }

    if (interaction.isModalSubmit()) {
      const handle = modalHandlers[interaction.customId];
      if (handle) await handle(interaction, repository);
      return;
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
