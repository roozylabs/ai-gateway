import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getBackendApiUrl(): string {
  if (process.env.API_URL) return process.env.API_URL;
  if (process.env.INTERNAL_API_URL) return process.env.INTERNAL_API_URL;
  if (process.env.NODE_ENV === 'development') return 'http://localhost:8080';
  return 'http://api:8080';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  const isLoginPage = pathname === '/login';
  const isOnboardingPage = pathname === '/onboarding';
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.includes('favicon.ico');
  // Backend API and LLM inference reverse-proxies (/api/*, /v1/*) are authenticated
  // and authorized directly at the Go engine boundary (internal/middleware/auth.go).
  const isProxiedBackendRoute =
    pathname.startsWith('/api') ||
    pathname.startsWith('/v1');
  const isHealthCheck = pathname === '/health';

  if (isStaticAsset || isProxiedBackendRoute || isHealthCheck) {
    return NextResponse.next();
  }

  // Allow internal Next.js build-time static page collection requests
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.includes('Next.js') || request.headers.has('x-next-data')) {
    return NextResponse.next();
  }

  // Restrict protected pages if no auth_token cookie
  if (!token && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Server-side onboarding check: prevents any visual delay / dashboard flash
  if (token) {
    try {
      const backendUrl = getBackendApiUrl();
      const res = await fetch(`${backendUrl}/api/user/permissions`, {
        headers: {
          Cookie: `auth_token=${token}`,
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        const isOnboarded = Boolean(data?.isOnboarded);

        // If user is not yet onboarded, redirect immediately on the server to /onboarding
        if (!isOnboarded && !isOnboardingPage) {
          const onboardingUrl = new URL('/onboarding', request.url);
          return NextResponse.redirect(onboardingUrl);
        }

        // If user is already onboarded, redirect away from /onboarding and /login to /
        if (isOnboarded && (isOnboardingPage || isLoginPage)) {
          const dashboardUrl = new URL('/', request.url);
          return NextResponse.redirect(dashboardUrl);
        }
      }
    } catch (_err) {
      if (token && isLoginPage) {
        const dashboardUrl = new URL('/', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
