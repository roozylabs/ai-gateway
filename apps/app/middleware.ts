import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  const isLoginPage = pathname === '/login';
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

  // Redirect to dashboard if user has auth_token cookie and accesses /login
  if (token && isLoginPage) {
    const dashboardUrl = new URL('/', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
