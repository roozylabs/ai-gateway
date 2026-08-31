# Version Synchronization Rule

## Rule: Mandatory Version Synchronization Across Monorepo

Whenever a new version release is tagged (e.g. `v0.1.0`), **ALL** version strings across package manifests, UI components, settings pages, and API health endpoints **MUST BE SYNCHRONIZED** atomically to match the target release version.

Refer to `.agents/rules/semantic-versioning-and-releases.md` for SemVer 2.0.0 rules and release workflows.

### Required Synchronization Target Locations:

1. **Root Configuration & Package Manifests**:
   - `package.json` (`"version": "0.1.0"`)
   - `apps/app/package.json` (`"version": "0.1.0"`)
   - `apps/web/package.json` (`"version": "0.1.0"`)
   - `packages/sdk/package.json` (`"version": "0.1.0"`)
   - `packages/cli/package.json` (`"version": "0.1.0"`)

2. **Frontend UI Footers & Headers**:
   - `apps/app/components/AppLayout.tsx` (Sidebar/Header version badge `v0.1.0`)
   - `apps/app/app/settings/page.tsx` (System & Infrastructure backend version `v0.1.0`)

3. **Backend API Endpoints, Telemetry & Swagger Annotations**:
   - `apps/api/cmd/server/main.go` (`// @version 0.1.0`)
   - `apps/api/internal/handlers/health.go` (`HealthResponse{Version: "0.1.0"}`)
   - `apps/api/internal/telemetry/otel.go` (`semconv.ServiceVersionKey.String("0.1.0")`)
   - `apps/api/docs/docs.go` (`"version": "0.1.0"`)

4. **Documentation & Release Files**:
   - `CHANGELOG.md` (Top release section header `## [0.1.0] - YYYY-MM-DD`)
   - `README.md` (Badge header & architecture specification)
   - `docs/PRD.md` (Revision History version entry)

### Enforcement Rule:
NEVER leave stale hardcoded version strings (`v2.1.0`, `v2.2.0`, `v1.0.0`) when updating documentation, releasing new pillars, or bumping project versions.
