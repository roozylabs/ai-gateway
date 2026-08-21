# CHANGELOG and README Maintenance Rules

This rule governs when and how to update `README.md` and `CHANGELOG.md` when making changes to the AI Gateway repository.

---

## 1. README.md Update Rules

`README.md` is the primary public overview and documentation portal for the repository.

### When to Update `README.md`:
1. **Core Feature Addition**: Only update `README.md` when introducing new major capabilities (e.g., Smart Router, Budget Manager, new provider support, new rotation strategies).
2. **API Endpoint / Route Changes**: Update the "Endpoint API Ringkas" table if new client/admin endpoints are added or modified.
3. **Environment Variable Changes**: Update the Environment Variables table if `.env` keys are added or modified.
4. **Architecture / Tech Stack Changes**: Update Tech Stack or Architecture diagrams if major components/technologies are added.

### When NOT to Update `README.md`:
- Do NOT update `README.md` for minor bug fixes, internal refactoring, typo corrections, or minor UI tweaks.

---

## 2. CHANGELOG.md Update Rules

`CHANGELOG.md` tracks project history following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/).

### Mandatory Changelog Maintenance:
1. **Every Version / Feature Release**: Whenever a new feature, bug fix, or release is committed to `main`, append an entry under the appropriate version header:
   - `## [X.Y.Z] - YYYY-MM-DD`
2. **Use Categorized Sections**:
   - `### Added` for new features or capabilities.
   - `### Changed` for changes in existing functionality.
   - `### Fixed` for any bug fixes.
   - `### Deprecated` for soon-to-be removed features.
   - `### Removed` for now removed features.
   - `### Security` in case of vulnerabilities.
3. **Keep Descriptions Concise**: Write bullet points focusing on user-facing impact, key features, and resolved issues.
