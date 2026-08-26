# Centralized Routes & Endpoint Enums Rule

## Scope
Applies to all navigation, API calls, cookies, and route checks in `apps/app`.

## Guidelines

### 1. No Hardcoded Magic Strings for Routes or Endpoints
- Never hardcode raw string paths for page routes (e.g., `'/login'`, `'/onboarding'`, `'/'`), API endpoints (e.g., `'/api/sse'`), or cookie names (e.g., `'auth_token'`).
- Always import and use centralized enums from `@/constants/routes`:
  ```typescript
  import { AppRoutes, ApiEndpoints, CookieKeys } from '@/constants/routes';
  ```

### 2. Examples
- **Bad**:
  ```typescript
  if (pathname === '/login' || !Cookies.get('auth_token')) ...
  const eventSource = new EventSource('/api/sse');
  router.push('/login');
  ```
- **Good**:
  ```typescript
  if (pathname === AppRoutes.LOGIN || !Cookies.get(CookieKeys.AUTH_TOKEN)) ...
  const eventSource = new EventSource(ApiEndpoints.SSE);
  router.push(AppRoutes.LOGIN);
  ```
