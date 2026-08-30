import { cookies } from 'next/headers';
import type { ApiUserPermissionsResponse } from '@/lib/api/types/auth';

function getBackendApiUrl(): string {
  if (process.env.API_URL) return process.env.API_URL;
  if (process.env.INTERNAL_API_URL) return process.env.INTERNAL_API_URL;
  if (process.env.NODE_ENV === 'development') return 'http://localhost:8080';
  return 'http://api:8080';
}

export async function getServerUserPermissions(): Promise<ApiUserPermissionsResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    const backendUrl = getBackendApiUrl();
    const res = await fetch(`${backendUrl}/api/user/permissions`, {
      headers: {
        Cookie: `auth_token=${token}`,
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (res.ok) {
      return (await res.json()) as ApiUserPermissionsResponse;
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && (err as { digest: string }).digest === 'DYNAMIC_SERVER_USAGE') {
      throw err;
    }
    console.error('[SSR Permissions Fetch Failed]', err);
  }
  return null;
}
