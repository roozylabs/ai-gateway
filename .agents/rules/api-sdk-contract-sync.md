# Rule: API to SDK & CLI Contract Synchronization & SemVer Versioning

## Description

Whenever changes are made to the Go API backend (`apps/api`), the agent **MUST** check for breaking changes and synchronize the TypeScript SDK (`packages/sdk`) and Prism CLI (`packages/cli`) to maintain 100% API contract alignment.

---

## Verification & Synchronization Workflow

Whenever modifying `apps/api` (handlers, proxy request/response schemas, headers, routing policies, database models):

### 1. Breaking Change Inspection
Check if any of the following changes occurred:
- Deleted or renamed API endpoints (`/v1/*` or `/api/*`).
- Changed request payload fields, parameter types, or required headers (`X-Prism-*`).
- Modified error response schemas or status codes.
- Added new models, tools, or agent policy parameters.

### 2. Update SDK & CLI
- **TypeScript SDK (`packages/sdk`)**: Update `src/types.ts`, modules (`chat.ts`, `models.ts`, etc.), and exported client methods.
- **Prism CLI (`packages/cli`)**: Update commands (`src/commands/`), options, and output tables.
- **OpenAPI Spec (`docs/openapi.yaml`)**: Re-generate spec using `pnpm run openapi:generate`.

### 3. Required Verification Commands
Execute build checks across the workspace before declaring completion:
```bash
# Verify SDK compilation & type safety
pnpm run build:sdk

# Verify CLI compilation
pnpm run build:cli

# Re-generate OpenAPI 3.0 specification
pnpm run openapi:generate
```

---

## Semantic Versioning (SemVer) Rules for SDK & CLI

Both `@roozylabs/prism` and `@roozylabs/prism-cli` follow **Semantic Versioning (MAJOR.MINOR.PATCH)**:

| Version Bump | Criteria | Example Trigger |
| :--- | :--- | :--- |
| **MAJOR (`X.0.0`)** | Incompatible/breaking API contract changes | Removed endpoint, renamed required parameter, incompatible authentication change |
| **MINOR (`2.X.0`)** | Backwards-compatible new features & capabilities | Added new SDK module, new CLI command, new model/provider support, new optional parameter |
| **PATCH (`2.1.X`)** | Backwards-compatible bug fixes & type corrections | Type hint fix, error message clarification, formatting fix, documentation update |

### Mandatory Version Synchronization:
When bumping project release versions, ensure `packages/sdk/package.json` and `packages/cli/package.json` version strings match the target release.
