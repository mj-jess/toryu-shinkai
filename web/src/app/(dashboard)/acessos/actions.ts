'use server';

import { revalidatePath } from 'next/cache';
import { isCoreAdmin } from '@/access';
import {
  findAllowedUser,
  insertAllowedUser,
  insertAuditEvent,
  removeAllowedUser,
  setAllowedUserAdmin,
  updateAllowedUserLabel,
} from '@/db';
import { nowTimestampBR } from '@/format';
import { requireAdmin } from '@/session';

export interface AccessResult {
  ok: boolean;
  error?: 'invalid' | 'exists' | 'core' | 'notFound' | 'failed';
}

/** Discord snowflake ids are 17–20 digits. */
const DISCORD_ID = /^\d{17,20}$/;

/** Records an access change in the audit trail — never breaks the flow. */
async function logAccess(
  actor: string,
  action: string,
  discordId: string,
  label: string,
): Promise<void> {
  try {
    await insertAuditEvent({
      createdAt: nowTimestampBR(),
      actor,
      source: 'dashboard',
      entity: 'access',
      action,
      entityRef: discordId,
      targetName: label,
      changes: null,
    });
  } catch (error) {
    console.error('Failed to record access audit event:', error);
  }
}

/** Grants a Discord id access to the dashboard, optionally as an admin. */
export async function addAccess(values: {
  discordId: string;
  label: string;
  isAdmin: boolean;
}): Promise<AccessResult> {
  const admin = await requireAdmin();
  const discordId = values.discordId.trim();
  const label = values.label.trim();
  if (!DISCORD_ID.test(discordId)) return { ok: false, error: 'invalid' };
  if (isCoreAdmin(discordId)) return { ok: false, error: 'core' };
  if (await findAllowedUser(discordId)) return { ok: false, error: 'exists' };

  try {
    await insertAllowedUser({ discordId, label, isAdmin: values.isAdmin, addedBy: admin.name });
  } catch {
    return { ok: false, error: 'failed' };
  }
  await logAccess(admin.name, values.isAdmin ? 'granted_admin' : 'granted', discordId, label);
  revalidatePath('/acessos');
  return { ok: true };
}

/** Revokes a table member's access (the core is never removable). */
export async function removeAccess(discordId: string): Promise<AccessResult> {
  const admin = await requireAdmin();
  if (isCoreAdmin(discordId)) return { ok: false, error: 'core' };
  const existing = await findAllowedUser(discordId);
  if (!existing) return { ok: false, error: 'notFound' };

  try {
    await removeAllowedUser(discordId);
  } catch {
    return { ok: false, error: 'failed' };
  }
  await logAccess(admin.name, 'revoked', discordId, existing.label);
  revalidatePath('/acessos');
  return { ok: true };
}

/** Renames a table member (updates the friendly label). */
export async function renameAccess(discordId: string, label: string): Promise<AccessResult> {
  const admin = await requireAdmin();
  if (isCoreAdmin(discordId)) return { ok: false, error: 'core' };
  const existing = await findAllowedUser(discordId);
  if (!existing) return { ok: false, error: 'notFound' };

  try {
    await updateAllowedUserLabel(discordId, label.trim());
  } catch {
    return { ok: false, error: 'failed' };
  }
  await logAccess(admin.name, 'renamed', discordId, label.trim());
  revalidatePath('/acessos');
  return { ok: true };
}

/** Grants or revokes the admin flag on a table member. */
export async function setAdmin(discordId: string, isAdmin: boolean): Promise<AccessResult> {
  const admin = await requireAdmin();
  if (isCoreAdmin(discordId)) return { ok: false, error: 'core' };
  const existing = await findAllowedUser(discordId);
  if (!existing) return { ok: false, error: 'notFound' };

  try {
    await setAllowedUserAdmin(discordId, isAdmin);
  } catch {
    return { ok: false, error: 'failed' };
  }
  await logAccess(
    admin.name,
    isAdmin ? 'admin_granted' : 'admin_revoked',
    discordId,
    existing.label,
  );
  revalidatePath('/acessos');
  return { ok: true };
}
