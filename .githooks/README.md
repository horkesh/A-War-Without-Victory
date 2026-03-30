# Repo Hooks

This repo uses `core.hooksPath=.githooks` for local git hooks.

Current purpose:

- block commits when governed changes do not have a valid active governance artifact

Main hook:

- `pre-commit` -> runs `scripts/repo/check_claude_governance.ps1 -Staged`
