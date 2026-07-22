import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { requireUser } from '@/session';
import { logout } from '../actions';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <DashboardShell user={user} onLogout={logout}>
      {children}
    </DashboardShell>
  );
}
