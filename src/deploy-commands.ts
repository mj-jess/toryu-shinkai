import { PermissionFlagsBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { AUDIT_SETUP_COMMAND_NAME } from './enrollment/audit-log.js';
import { SETUP_COMMAND_NAME } from './enrollment/panel.js';
import { requireEnv } from './env.js';
import { messages } from './messages.js';

const commands = [
  new SlashCommandBuilder()
    .setName(SETUP_COMMAND_NAME)
    .setDescription(messages.setup.commandDescription)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder()
    .setName(AUDIT_SETUP_COMMAND_NAME)
    .setDescription(messages.auditSetup.commandDescription)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
];

const rest = new REST().setToken(requireEnv('DISCORD_TOKEN'));

const result = (await rest.put(
  Routes.applicationGuildCommands(requireEnv('CLIENT_ID'), requireEnv('GUILD_ID')),
  { body: commands },
)) as unknown[];

console.log(`Registered ${result.length} command(s) in the guild.`);
