'use server';

import { signIn, signOut } from '@/auth';

/** Starts the Discord OAuth flow; lands on the enrollments page on success. */
export async function loginWithDiscord(): Promise<void> {
  await signIn('discord', { redirectTo: '/matriculas' });
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
