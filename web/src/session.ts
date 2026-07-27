import { redirect } from 'next/navigation';
import { isAdminUser } from '@/access';
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

/** Guards admin-only pages: signs the user in, then sends non-admins home. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!(await isAdminUser(user.discordId))) redirect('/inicio');
  return user;
}
