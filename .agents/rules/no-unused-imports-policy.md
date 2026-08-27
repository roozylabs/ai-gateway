# Strict Code Hygiene: Prohibition of Unused Imports & Unnecessary React Imports

This rule governs code hygiene across all TypeScript files in `apps/app` and the repository.

## Directives

### 1. Omission of Unnecessary `import React from 'react'`
- **DO NOT** add `import React from 'react';` to `.tsx` or `.ts` files in Next.js 13+ / 14+ / 15+.
- **Mandatory Policy**:
  - The JSX Transform handles JSX compilation automatically. Default React imports are prohibited unless directly using `React.Component`, `React.useState`, etc.
  - When importing type definitions, use explicit type imports:
    ```typescript
    import type { ReactNode } from 'react';
    ```

### 2. Mandatory Removal of Unused Imports
- **DO NOT** leave unused imports (`cn`, `useState`, icons, components) in any file.
- **Mandatory Cleaning**:
  - Every file edit or creation MUST prune all unused symbols, functions, icons, and components from top-level `import` statements.

### 3. ESLint Enforcement
- Unused variables and imports are enforced as errors in `apps/app/.eslintrc.json`:
  ```json
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "caughtErrorsIgnorePattern": "^_"
    }
  ]
  ```
- Unused parameters or caught error bindings MUST use the `_` prefix (e.g. `_parseError`, `_evt`).

### 4. Build Verification
- Running `pnpm build` (`tsc --noEmit && next build`) MUST pass with zero unused variable/import warnings or compilation errors.
