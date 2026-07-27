import type { ReactNode } from 'react';
import { isAdminUser } from '@/access';
import { DashboardShell } from '@/components/dashboard-shell';
import { requireUser } from '@/session';
import { logout } from '../actions';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const isAdmin = await isAdminUser(user.discordId);
  return (
    <DashboardShell user={user} isAdmin={isAdmin} onLogout={logout}>
      {children}
    </DashboardShell>
  );
}
