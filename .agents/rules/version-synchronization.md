# Version Synchronization Rule

## Rule: Mandatory Version Synchronization Across Monorepo

Whenever a new version release is tagged (e.g. `v2.1.0`), **ALL** version strings across package manifests, UI components, settings pages, and API health endpoints **MUST BE SYNCHRONIZED** to match the target release version.

### Required Synchronization Target Locations:

1. **Root Configuration Manifests**:
   - `package.json` (`"version": "2.1.0"`)
   - `apps/app/package.json` (`"version": "2.1.0"`)
   - `apps/web/package.json` (`"version": "2.1.0"`)

2. **Frontend UI Footers & Headers**:
   - `apps/app/components/AppLayout.tsx` (Sidebar/Header version badge `v2.1.0`)
   - `apps/app/app/settings/page.tsx` (System & Infrastructure backend version `<Text code>v2.1.0</Text>`)

3. **Backend API Endpoints & Swagger Annotations**:
   - `apps/api/cmd/server/main.go` (`// @version 2.1.0`)
   - `apps/api/internal/handlers/health.go` (`HealthResponse{Version: "2.1.0"}`)

4. **Documentation & Release Files**:
   - `CHANGELOG.md` (Top release section header `## [2.1.0] - YYYY-MM-DD`)
   - `README.md` (Badge header & architecture specification)
   - `docs/PRD.md` (Revision History version entry)

### Enforcement Rule:
NEVER leave stale hardcoded version strings (`v1.0.0`) when updating documentation, releasing new pillars, or bumping project versions.
