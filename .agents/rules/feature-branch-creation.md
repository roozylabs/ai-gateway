# Feature Branch Creation & Management Standards

This rule governs the creation, naming, and workflow of isolated feature branches for any new capability, bug fix, or refactoring in `roozylabs/prism`.

## 1. Mandatory Separate Feature Branch Creation Rule

> [!CRITICAL]
> **STRICT FEATURE BRANCH ISOLATION**: Before modifying ANY source code, creating files, or implementing ANY new feature/fix, the agent MUST create a dedicated, separate Git branch (or isolated Git worktree). 
> **Committing or modifying code directly on `main` / `master` is STRICTLY FORBIDDEN.**

- **Mandatory Isolation**: Every task MUST have its own dedicated branch created off latest `main` (`git checkout -b <type>/<description>`).
- **Single Concern per Branch**: Each branch must address a single logical feature or issue. Do not bundle unrelated changes.

## 2. Branch Naming Conventions

Branches MUST follow the structured format:
`<type>/<kebab-case-short-description>`

### Standard Types:
- `feat/`: New feature or capability (e.g. `feat/google-oauth-adapter`, `feat/billing-usage-dashboard`)
- `fix/`: Bug fix or error resolution (e.g. `fix/sse-streaming-truncation`, `fix/rate-limit-header-parsing`)
- `refactor/`: Code restructuring without functional changes (e.g. `refactor/proxy-router-pipeline`)
- `docs/`: Documentation, PRD, or CHANGELOG updates (e.g. `docs/api-v2-specs`)
- `chore/`: Dependency updates, build configuration, or tool adjustments (e.g. `chore/eslint-v9-migration`)
- `perf/`: Performance optimization (e.g. `perf/sql-query-indexing`)

## 3. Branch Creation Workflow

Before modifying any source code:
1. **Clean Working Directory**: Verify working directory state (`git status`).
2. **Fetch Base Branch**: Ensure local `main` is up to date with remote (`git checkout main && git pull`).
3. **Create Branch**:
   - Local Git command: `git checkout -b <type>/<description>`
   - Or GitHub MCP tool (`github-mcp-server` -> `create_branch`) when operating via remote workflow.
4. **Isolated Worktree (Recommended for Agents)**:
   - For agentic tasks, prefer creating an isolated worktree via `using-git-worktrees` skill to prevent workspace conflicts.

## 4. Mandatory End-of-Task Delivery Pipeline

Upon completing any feature, fix, enhancement, or refactoring task, the agent MUST execute the following 4-step delivery pipeline:

1. **Atomic Conventional Commit**:
   - Verify build and tests pass (`pnpm typecheck` / `go test`).
   - Stage changes and create commit(s) using conventional commit format (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
2. **Push Branch to Remote**:
   - Push the feature branch to remote GitHub repository (`git push origin <type>/<description>`).
3. **Automated Pull Request Creation**:
   - Call `github-mcp-server` tool `create_pull_request` with title following Conventional Commits format and body following `.github/PULL_REQUEST_TEMPLATE.md`.
4. **Automated Label Assignment**:
   - Call `github-mcp-server` tool `issue_write` (`method: "update"`, `issue_number: <pr_number>`, `labels: [...]`) to attach relevant GitHub labels.

## 5. Post-Merge Branch Cleanup & Lifecycle End

After the Pull Request has been merged into `main` / `master`:
- **Remote Branch Deletion**: Delete the remote feature branch (or enable GitHub's "Automatically delete head branches" setting).
- **Local Branch Deletion**: Switch back to `main`, pull latest changes, and delete the local feature branch:
  ```bash
  git checkout main
  git pull origin main
  git branch -d <type>/<description>
  ```
- **Worktree Cleanup**: If an isolated Git worktree was created, prune and remove the worktree folder:
  ```bash
  git worktree remove .worktrees/<branch-name>
  ```

