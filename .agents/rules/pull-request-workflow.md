# Pull Request Workflow & GitHub MCP Integration Guidelines

This rule governs feature branching, commit orchestration, and automated Pull Request (PR) creation using `github-mcp-server`.

## Directives

### 1. Feature Branching & Multi-Commit Orchestration
- **Feature Branch Isolation**: For any multi-step task, major refactoring, or new capability involving multiple commits, work MUST be performed on an isolated feature branch (e.g. `feat/sandbox-audit`, `fix/select-responsive`, `refactor/code-hygiene`).
- **Semantic Commit Messages**: Every commit MUST follow conventional commit specifications (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).

### 2. Robust Pull Request Automation (`github-mcp-server`)
- When code changes are ready for review or merging, leverage the lazy MCP tool `call_mcp_tool` with `ServerName: "github-mcp-server"` and `ToolName: "create_pull_request"`.
- **Mandatory PR Body Template**:
  Every Pull Request created MUST contain a comprehensive, structured Markdown description formatted as follows:

```markdown
## Summary of Changes
Provide a clear executive summary of the features, architectural decisions, and bug fixes introduced.

## Key Accomplishments & Audit Checklist
- [x] Detailed feature / fix 1
- [x] Detailed feature / fix 2
- [x] Detailed feature / fix 3

## Verification & Build Results
- **TypeScript Typecheck (`tsc --noEmit`)**: PASS (0 errors)
- **Production Build (`pnpm build`)**: PASS (0 errors, 24/24 static routes generated)

## Impacted Components & Files
- `apps/app/...`: [Description]
- `apps/api/...`: [Description]
- `.agents/rules/...`: [Description]

## Documentation Synchronization
- [x] `README.md` updated
- [x] `docs/PRD.md` (Revision History) updated
- [x] `CHANGELOG.md` updated
```

### 3. Automated PR Life-cycle Management
- **Status Checks**: Use `list_pull_requests` or `pull_request_read` to inspect open PRs and check review comments.
- **Merge Strategy**: Use `merge_pull_request` only after verification checks (`pnpm build`) pass cleanly.
