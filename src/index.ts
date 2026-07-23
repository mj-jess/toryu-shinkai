import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { createDatabase } from './database.js';
import {
  AUDIT_CHANNEL_SETTING_KEY,
  AUDIT_SETUP_COMMAND_NAME,
  EnrollmentAuditLog,
} from './enrollment/audit-log.js';
import { handleEnrollmentInteraction, type BrowseContext } from './enrollment/browse-handlers.js';
import { BrowseSessions } from './enrollment/browse-session.js';
import { buildPanelMessage, SETUP_COMMAND_NAME } from './enrollment/panel.js';
import { EnrollmentRepository } from './enrollment/repository.js';
import { requireEnv } from './env.js';
import { handleKoiInteraction, type KoiContext } from './koi/handlers.js';
import {
  buildKoiPanelMessage,
  KOI_LOG_CHANNEL_SETTING_KEY,
  KOI_LOG_SETUP_COMMAND_NAME,
  KOI_PANEL_CHANNEL_SETTING_KEY,
  KOI_SETUP_COMMAND_NAME,
} from './koi/panel.js';
import { KoiChannelLog } from './koi/sales-log.js';
import { KoiSalesRepository } from './koi/sales-repository.js';
import { startWeeklyPostSchedule } from './koi/weekly-post.js';
import { messages } from './messages.js';
import { SettingsRepository } from './settings.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const db = await createDatabase(requireEnv('DATABASE_URL'));
const settings = new SettingsRepository(db);

const ctx: BrowseContext = {
  repository: new EnrollmentRepository(db),
  sessions: new BrowseSessions(),
  audit: new EnrollmentAuditLog(client, settings),
};

const koiSales = new KoiSalesRepository(db);
const koiCtx: KoiContext = {
  db,
  sales: koiSales,
  log: new KoiChannelLog(client, settings),
};

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot online as ${readyClient.user.tag}`);
  startWeeklyPostSchedule({ client, settings, sales: koiSales });
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

    // /academia-log-setup — registers the current channel as the audit log destination
    if (interaction.isChatInputCommand() && interaction.commandName === AUDIT_SETUP_COMMAND_NAME) {
      await settings.set(AUDIT_CHANNEL_SETTING_KEY, interaction.channelId);
      await interaction.reply({
        content: messages.auditSetup.channelConfigured,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // /koi-setup — publishes the KOI panel; the weekly summary lands in this channel
    if (interaction.isChatInputCommand() && interaction.commandName === KOI_SETUP_COMMAND_NAME) {
      if (!interaction.channel?.isSendable()) {
        await interaction.reply({
          content: messages.setup.channelNotSendable,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await interaction.channel.send(buildKoiPanelMessage());
      await settings.set(KOI_PANEL_CHANNEL_SETTING_KEY, interaction.channelId);
      await interaction.reply({
        content: messages.koiSetup.panelPublished,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // /koi-log-setup — registers the current channel for the sale records
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === KOI_LOG_SETUP_COMMAND_NAME
    ) {
      await settings.set(KOI_LOG_CHANNEL_SETTING_KEY, interaction.channelId);
      await interaction.reply({
        content: messages.koiSetup.logChannelConfigured,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (await handleKoiInteraction(interaction, koiCtx)) return;

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
