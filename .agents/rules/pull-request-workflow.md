# Pull Request Workflow & GitHub MCP Integration Guidelines

This rule governs feature branching, commit orchestration, and automated Pull Request (PR) creation using `github-mcp-server`.

## 1. Feature Branching & Multi-Commit Orchestration

> [!CRITICAL]
> **MANDATORY SEPARATE FEATURE BRANCH**: A dedicated branch MUST be created for every new feature, bug fix, or refactoring BEFORE any code changes are made. Direct commits to `main` are strictly prohibited.

- **Feature Branch Requirement**: For any new capability, bug fix, or refactoring, work MUST be performed on an isolated feature branch named according to `.agents/rules/feature-branch-creation.md` (`feat/...`, `fix/...`, `refactor/...`).
- **Semantic Commit Messages**: Every commit MUST follow conventional commit specifications (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `perf:`).

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

## 3. Mandatory End-of-Task Completion Pipeline (Commit -> Push -> PR -> Labels)

Upon completing any feature, bug fix, or task implementation, the agent MUST automatically execute the following sequence:

1. **Commit**: Verify `pnpm typecheck` / `go test` pass, then commit staged changes using Conventional Commit syntax.
2. **Push**: Push the feature branch to remote (`git push origin <branch>`).
3. **Pull Request**: Call `create_pull_request` on `github-mcp-server` passing standard title and body template.
4. **Labels**: Immediately call `issue_write` (`method: "update"`, `issue_number: <pr_number>`, `labels: [...]`) on `github-mcp-server` to attach relevant labels (`feat`, `fix`, `refactor`, `documentation`, `chore`, `ci`, `rules`).

- **Merge Strategy**: Use `merge_pull_request` only after verification checks (`pnpm build`, `go test`) pass cleanly.
- **Post-Merge Cleanup**: After merging, delete the head branch on remote and delete local feature branch / worktree according to `.agents/rules/feature-branch-creation.md`.
- **Release Tagging on `main` (if releasing a version)**:
  1. Switch to `main` and pull latest: `git checkout main && git pull origin main`.
  2. Create annotated tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z: <Summary>"`.
  3. Push tag to GitHub: `git push origin vX.Y.Z`.
  See `.agents/rules/semantic-versioning-and-releases.md` for full release guidelines.



