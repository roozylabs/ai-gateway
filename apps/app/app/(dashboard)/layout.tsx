import type { ReactNode } from 'react';
import { getServerUserPermissions } from '@/lib/api/server-auth';
import { PermissionProvider } from '@/components/PermissionProvider';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const initialPermissions = await getServerUserPermissions();

  return (
    <PermissionProvider initialData={initialPermissions}>
      {children}
    </PermissionProvider>
  );
}
