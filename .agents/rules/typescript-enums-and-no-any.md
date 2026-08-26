# TypeScript Enums and Zero 'any' Policy Rule

## Scope
Applies to all frontend TypeScript and React code in `apps/app` (`.ts` and `.tsx` files).

## Guidelines

### 1. Strong Role & Permission Enums / Union Types
- Never hardcode raw string literals for roles (e.g. `'owner'`, `'admin'`, `'member'`, `'viewer'`) or permission slugs directly in functions or components.
- Always use strongly-typed Enums or strict String Literal Union types:
  ```typescript
  export enum UserRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    MEMBER = 'member',
    VIEWER = 'viewer',
  }
  ```
- Components like `PermissionProvider.tsx` and API responses must consume `UserRole` enums or `UserRole` union types to guarantee type-safety across the application.

### 2. Strict Prohibition of `any`
- The `any` type is strictly forbidden across all files in `apps/app`.
- Use specific interfaces, `Record<string, unknown>`, generics, or `unknown` with runtime type narrowing instead:
  - **Bad**: `payload: any`
  - **Good**: `payload: Record<string, unknown>` or `payload: unknown`
  - **Bad**: `data: any[]`
  - **Good**: `data: T[]` or `data: Record<string, unknown>[]`
