# Task Governance Artifacts

This folder exists to make Claude workflow governance reviewable and enforceable.

## Rule

For any non-trivial roadmap, command, operations, or architecture task, keep
`ACTIVE_TASK_GOVERNANCE.md` updated while the task is in progress.

Do not create a new artifact file for every tiny step.
Prefer one actively maintained file per active task stream.

## Why this exists

Prompts are easy to forget.
Chat history is easy to lose.
This file gives the repo one durable place to check:

- canonical owner
- demoted path
- decision boundary
- done means
- UI/report truth
- roadmap slot

## Required companion checks

- `.claude/commands/taskforce.md`
- `.claude/commands/checkpoint.md`
- `.claude/commands/governance-review.md`
- `.claude/commands/roadmap-patch.md`
- `docs/20_engineering/ROADMAP_GOVERNANCE.md`
- `docs/20_engineering/COMMAND_AUTHORITY_GATES.md`
