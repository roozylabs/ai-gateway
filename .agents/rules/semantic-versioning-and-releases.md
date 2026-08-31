# Semantic Versioning (SemVer 2.0.0), Feature Flags, and Git Release Tagging

This rule defines the authoritative versioning, feature flag lifecycle, and git release tagging standards for the RoozyLabs Prism monorepo.

---

## 1. Semantic Versioning Specification (SemVer 2.0.0)

All packages, APIs, SDKs, CLIs, and applications in this monorepo adhere strictly to **SemVer 2.0.0** (`MAJOR.MINOR.PATCH` / e.g. `v0.1.0`):

```text
v MAJOR . MINOR . PATCH
    │       │       │
    │       │       └── Backward-compatible bug fixes & performance patches
    │       └────────── Backward-compatible new features & feature flag additions
    └────────────────── Incompatible API breaking changes or schema drops
```

### Pre-Production Foundation Baseline (`0.y.z`)
- Prior to public General Availability (GA), the baseline version is **`0.y.z`** (e.g. `v0.1.0`).
- `0.1.0` represents the initial development foundation release.
- Increments during `0.y.z`:
  - `0.2.0`, `0.3.0`: Significant new features, new provider adapters, or engine refactors.
  - `0.1.1`, `0.1.2`: Bug fixes, hotfixes, documentation, and security patches.
- `1.0.0`: The first official production release with declared API stability.

---

## 2. Mandatory Change Categorization for AI Agents

Before committing any code or creating a PR, the AI agent MUST analyze the changes and identify the exact SemVer impact:

### A. `MAJOR` Version Bump (`X.0.0` or `0.X.0` breaking)
Triggered when:
- Removing or renaming public API endpoints (`/v1/...` or `/api/v1/...`).
- Breaking database migrations that delete columns or alter constraints without backwards compatibility.
- Removing deprecated feature flags or altering existing authentication token structures.

### B. `MINOR` Version Bump (`x.Y.0`)
Triggered when:
- Adding new backward-compatible API endpoints or proxy routing capabilities.
- Adding a new Feature Flag (experimental, beta, or plan-gated).
- Adding new UI dashboard pages, new components, or new adapter integrations (e.g. new AI provider).
- Additive database migrations (e.g. new tables, new nullable columns).

### C. `PATCH` Version Bump (`x.y.Z`)
Triggered when:
- Resolving bugs, edge cases, error parsing, or validation logic.
- Performance optimizations without changing public API contracts.
- Updating documentation, rules, comments, or test suites.

---

## 3. Feature Flag Lifecycle & Entitlement Policy

Feature flags allow code to be merged continuously into `main` while safely decoupling deployment from feature release across **Minor** versions:

1. **Experimental / Alpha**: Flag added with default `false`. Enabled via environment variable (e.g. `FEATURE_FLAG_REALTIME_ANOMALY=true`).
2. **Beta / Tier-Gated**: Flag enabled by default for specific subscription tiers (`pro`, `team`, `enterprise`) in the plan matrix.
3. **General Availability (GA)**: Flag enabled by default for all users (`true`).
4. **Retirement / Removal**: Once a feature is permanently established, the flag check is removed. If removing legacy code causes breaking changes, it is scheduled for a **Major** release.

---

## 4. Git Tagging & Release Workflow

When a version release is ready and merged into `main`, the release MUST be tagged with an annotated Git tag:

### Step-by-step Release Pipeline:
1. **Synchronize Versions**: Update version strings across all manifest files and Go constants to match the target release (e.g. `0.1.0`).
2. **Update CHANGELOG.md**: Add top release section with date and bullet points.
3. **Merge PR**: Squash-merge feature PR into `main`.
4. **Checkout `main` & Pull**:
   ```bash
   git checkout main
   git pull origin main
   ```
5. **Create Annotated Git Tag**:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z: <Concise Release Summary>"
   ```
6. **Push Tag to Remote**:
   ```bash
   git push origin vX.Y.Z
   ```

---

## 5. Summary Checklist for AI Agents
- [ ] Have I categorized the change into Major, Minor, or Patch?
- [ ] Have I synchronized all package manifests and code constants if this is a release?
- [ ] Are new experimental or tier-specific features wrapped in a Feature Flag?
- [ ] Has `CHANGELOG.md` been updated accordingly?
