# Repo Hooks

Registered worktrees currently use `core.hooksPath=.husky/_`. Husky's generated
wrappers delegate to the matching tracked hook under `.husky/`:

Current purpose:

- run the staged-file-aware TypeScript check from `.husky/pre-commit`
- retain the generated Git LFS hooks for checkout, commit, merge, and push events

The tracked `.githooks/pre-commit` is a historical governance hook. It runs
`scripts/repo/check_claude_governance.ps1 -Staged` only when a checkout is explicitly
configured to use `.githooks`; no registered worktree currently selects that path.
Both files remain available for that compatibility case pending a separate disposition.
