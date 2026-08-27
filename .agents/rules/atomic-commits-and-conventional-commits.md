# Atomic Commits & Conventional Commit Standards

This rule governs Git commit discipline, atomic change isolation, and conventional commit naming across all repository work.

## 1. Scope
Applies to all commits in `roozylabs/prism` (monorepo root, `apps/app`, `apps/api`, `apps/web`, `packages/`, `.agents/`).

## 2. Principle
Every commit MUST be **atomic**: representing a single, complete, logically independent unit of change that leaves the codebase in a building, passing, and coherent state.

## 3. Required Behavior
- **Conventional Commit Format**:
  Commit messages MUST follow conventional commit prefixes:
  - `feat:` New feature or capability
  - `fix:` Bug fix or error resolution
  - `refactor:` Code restructuring without functional change
  - `docs:` Documentation, PRD, CHANGELOG, or README updates
  - `chore:` Configuration, build, or dependency updates
  - `perf:` Performance optimization
  - `test:` Unit, integration, or E2E tests addition/fix
- **Atomic Scope Isolation**:
  - Keep commits small, isolated, and focused on one specific concern.
  - Run verification (`pnpm typecheck` / `go test`) BEFORE creating each commit so every commit in history is passing.
- **Multiple Commit Orchestration**:
  When completing a multi-step task, create incremental atomic commits for each component or phase, culminating in a Pull Request via `github-mcp-server`.

## 4. Forbidden Behavior
- **Monolithic Kitchen-Sink Commits**: Do NOT combine unrelated changes (e.g. fixing a UI bug AND refactoring database handlers AND updating CSS) in a single commit.
- **Broken Intermediate Commits**: Never commit code that breaks `pnpm build` or `go test`.
- **Non-Standard Messages**: Do NOT write vague commit messages like `"update"`, `"fix stuff"`, or `"changes"`.

## 5. Good Example
```text
feat(providers): extract ProviderForm component and add Zod schema validation
```

## 6. Bad Example
```text
fixed stuff and updated UI and database
```

## 7. Exceptions
None. All commits must be conventional and atomic.

## 8. Verification Method
- Code review, Git history inspection (`git log -n 5`), and CI/CD verification gates.
