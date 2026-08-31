# Pull Request Workflow & GitHub MCP Integration Guidelines

This rule governs feature branching, commit orchestration, and automated Pull Request (PR) creation using `github-mcp-server`.

## 1. Feature Branching & Multi-Commit Orchestration

> [!CRITICAL]
> **MANDATORY SEPARATE FEATURE BRANCH**: A dedicated branch MUST be created for every new feature, bug fix, or refactoring BEFORE any code changes are made. Direct commits to `main` are strictly prohibited.

- **Feature Branch Requirement**: For any new capability, bug fix, or refactoring, work MUST be performed on an isolated feature branch named according to `.agents/rules/feature-branch-creation.md` (`feat/...`, `fix/...`, `refactor/...`).
- **Semantic Commit Messages**: Every commit MUST follow conventional commit specifications (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `perf:`).
  > See `.agents/rules/atomic-commits-and-conventional-commits.md` for full atomic commit & conventional commit discipline rules.

## 2. Robust Pull Request Standards (`github-mcp-server`)

When code changes are verified and ready for review or merging, leverage the MCP tool `call_mcp_tool` with `ServerName: "github-mcp-server"` and `ToolName: "create_pull_request"`.

### A. Mandatory PR Title Format
PR titles MUST follow the Conventional Commits format to ensure clear release notes and Git history:
`<type>(<scope>): <imperative short description>`

#### Title Examples:
- `feat(proxy): implement streaming SSE response transformation`
- `fix(auth): resolve JWT token expiration refresh race condition`
- `refactor(db): streamline sqlx query execution and error mapping`
- `docs(api): add OpenAPI specs for Multi-Tenant metering endpoints`

### B. Mandatory PR Description Template
Every Pull Request created MUST contain a comprehensive, structured Markdown description formatted as follows:

- **Minimal Icon Policy**: Keep PR titles and descriptions clean and professional. Avoid decorative emojis or excessive icons.

```markdown
## Summary of Changes
Provide a clear executive summary of the features, architectural decisions, and bug fixes introduced in this PR.

## Type of Change
- [ ] `feat`: New feature / capability
- [ ] `fix`: Bug fix or error resolution
- [ ] `refactor`: Code restructuring without API / functional change
- [ ] `docs`: Documentation, PRD, or CHANGELOG updates
- [ ] `chore`: Dependency, tool, or build configuration update

## Key Accomplishments & Audit Checklist
- [x] Detailed accomplishment / feature 1
- [x] Detailed accomplishment / feature 2
- [x] Detailed accomplishment / feature 3

## Verification & Build Results
- **TypeScript Typecheck (`tsc --noEmit` / `pnpm typecheck`)**: PASS (0 errors)
- **Go Unit & Adapter Tests (`go test ./...`)**: PASS (0 errors)
- **Production Build (`pnpm build`)**: PASS (0 errors)

## Impacted Components & Files
- `apps/app/...`: [Description of changes]
- `apps/api/...`: [Description of changes]
- `.agents/rules/...`: [Description of changes]

## Breaking Changes & Migration (if applicable)
- N/A or details on breaking changes and migration steps required.

## Documentation Synchronization
- [x] `README.md` updated (if applicable)
- [x] `docs/` or `PRD.md` updated
- [x] `CHANGELOG.md` updated
```

## 3. Mandatory End-of-Task Completion Pipeline (Commit -> Push -> PR -> Labels -> Merge)

> [!CRITICAL]
> **MANDATORY PR LABELING (NO UNLABELED PRs)**:
> Every Pull Request created MUST have at least 1-3 appropriate GitHub labels attached immediately after creation via `github-mcp-server` tool `issue_write`.
> Merging an unlabeled Pull Request is strictly prohibited.

Upon completing any feature, bug fix, refactor, or rule update, the agent MUST execute the following sequence without skipping any step:

1. **Verification**: Run `pnpm --filter prism-dashboard typecheck`, `pnpm --filter prism-dashboard build`, and `cd apps/api && go test ./...`.
2. **Commit**: Stage changes and commit with conventional commit format (`git add -A; git commit -m "..."`).
3. **Push**: Push feature branch to remote (`git push origin <branch>`).
4. **Create Pull Request**: Call `create_pull_request` on `github-mcp-server` passing standard title and body.
5. **Attach Labels (MANDATORY)**: Immediately call `issue_write` on `github-mcp-server` with:
   - `owner: "roozylabs"`
   - `repo: "prism"`
   - `issue_number: <pr_number>`
   - `method: "update"`
   - `labels: ["<label1>", "<label2>"]`
   
   **Standard Label Mapping Matrix**:
   | PR Type / Scope | Mandatory GitHub Labels |
   |---|---|
   | Feature (`feat:`) | `enhancement`, plus functional label (`auth`, `proxy`, `ui`, `database`, `api`) |
   | Bug Fix (`fix:`) | `bug`, plus functional label (`auth`, `proxy`, `ui`, `database`) |
   | Release Bump (`chore(release):`) | `release`, `chore` |
   | Documentation & Rules (`docs:`) | `documentation`, `rules` |
   | Refactoring (`refactor:`) | `refactor`, `enhancement` |
   | CI / Tooling (`chore:`, `ci:`) | `chore`, `ci` |

6. **Merge Pull Request**: Call `merge_pull_request` (`merge_method: "squash"`).
7. **Mandatory Post-Merge Branch Deletion**:
   - Delete the remote feature branch: `git push origin --delete <branch-name>`
   - Switch back to `main`, pull latest, and force delete local branch:
     ```bash
     git checkout main && git pull origin main && git branch -D <branch-name>
     ```
8. **Release Tagging on `main` (OpenCode Model Only)**:
   - *Note*: Gemini & Claude are strictly restricted to user code/logic. Only **OpenCode** executes release version bumps and tagging.
   - Create annotated tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z: <Summary>"`.
   - Push tag to GitHub: `git push origin vX.Y.Z`.
   See `.agents/rules/semantic-versioning-and-releases.md` and `.agents/rules/planning-and-model-policy.md` for full guidelines.




