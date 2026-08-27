# Documentation Standards & Sync Guidelines

This rule governs all documentation updates for `README.md`, `docs/PRD.md`, `CHANGELOG.md`, and any files in `docs/`.

## Directives

### 1. Prohibition of Emojis and Decorative Icons
- **DO NOT** use emojis or decorative icons (such as 💎, 🌐, 📐, ✨, 🏛️, 🔒, 🧠, 🚀, 📚, 📝, 🧪, 🛡️, etc.) in titles, section headings, bullet points, badge alt text, or tables in any documentation file.
- **Clean Standard Markdown**: Section titles MUST be clean, formal, professional plain text (e.g. `## System Architecture`, `## Key Features`, `## Quick Start Guide`).

### 2. Mandatory Triple-File Synchronization
When updating documentation for a feature, release, or system architecture change, you MUST update all three authoritative documentation files synchronously:
1. **`README.md`**: Update version badges, System Overview, Key Features list, and API Endpoints Summary table.
2. **`docs/PRD.md`**: Add an entry to the **Revision History** table with the exact version number, timestamp, and detailed summary of changes.
3. **`CHANGELOG.md`**: Add a semantic version header (e.g., `## [2.4.1] - YYYY-MM-DD`) with structured `Added`, `Changed`, `Fixed`, or `Security` categories.

### 3. Version Consistency
- Version numbers across `README.md`, `docs/PRD.md`, and `CHANGELOG.md` MUST match exactly.
