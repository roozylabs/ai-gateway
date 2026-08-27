# Strict ESLint & Build Verification Guidelines

This rule enforces strict build-time linting, type-checking, and zero-error standards across the repository.

## Directives

### 1. Mandatory Pre-Build Typecheck Integration (`pnpm build`)
- Running `pnpm build` in `apps/app` or root monorepo **MUST** run `tsc --noEmit` before executing `next build`.
- Any TypeScript error or ESLint violation will immediately abort the build process with code 1.

### 2. Strict ESLint Rule Configuration
- **`@typescript-eslint/no-explicit-any`**: Set to `"error"`. Using `any` causes build failure.
- **`@typescript-eslint/no-unused-vars`**: Set to `"error"` (excluding patterns starting with `_`).
- **`react-hooks/rules-of-hooks`**: Set to `"error"`.
- **`react-hooks/exhaustive-deps`**: Set to `"warn"`.

### 3. Build Verification Rule
- Before claiming completion of any frontend task or PR integration, `pnpm build` (or `pnpm run typecheck`) **MUST** pass with 0 errors.
