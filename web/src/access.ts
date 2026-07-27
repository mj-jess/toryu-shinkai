import { findAllowedUser } from '@/db';

/**
 * Access control for the dashboard. Two layers:
 *  - the **core**: Discord ids in `ALLOWED_DISCORD_IDS` (env) — always allowed
 *    and always admin; managed only by editing the env, never removable in the UI;
 *  - the **managed table** (`allowed_users`): additive, edited from the Acessos
 *    page. A table member can sign in; only those flagged `isAdmin` can manage.
 */
export function coreAdminIds(): string[] {
  return (process.env.ALLOWED_DISCORD_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isCoreAdmin(discordId: string): boolean {
  return discordId !== '' && coreAdminIds().includes(discordId);
}

/** Whether a Discord id may sign in: core (env) or present in the managed table. */
export async function canSignIn(discordId: string): Promise<boolean> {
  if (isCoreAdmin(discordId)) return true;
  return Boolean(await findAllowedUser(discordId));
}

/** Whether a Discord id may manage the access list: core, or a table admin. */
export async function isAdminUser(discordId: string): Promise<boolean> {
  if (isCoreAdmin(discordId)) return true;
  const row = await findAllowedUser(discordId);
  return Boolean(row?.isAdmin);
}
