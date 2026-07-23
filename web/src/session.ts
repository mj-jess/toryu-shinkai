import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export interface SessionUser {
  name: string;
  image: string | null;
  /** Discord user id — recorded on anything the member registers. */
  discordId: string;
}

/** Redirects to the login page when there is no authenticated session. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect('/login');
  return {
    name: user.name ?? 'Usuário',
    image: user.image ?? null,
    discordId: user.discordId ?? '',
  };
}
