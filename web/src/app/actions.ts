'use server';

import { signIn, signOut } from '@/auth';

/** Starts the Discord OAuth flow; lands on the dashboard home on success. */
export async function loginWithDiscord(): Promise<void> {
  await signIn('discord', { redirectTo: '/inicio' });
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
