---
name: awwv-pre-commit-check
description: Provide pre-commit checklist covering canon, determinism, ordering, tests, and ledger. Use when the user runs /awwv_pre_commit_check or asks for a pre-commit review.
---

# /awwv_pre_commit_check

## Trigger
Before committing changes.

## Inputs
- List of modified files and intended commit scope.

## Output
- Checklist: canon compliance, determinism, ordering, tests, ledger (append to `docs/PROJECT_LEDGER.md`; if change carries reusable knowledge, update `docs/PROJECT_LEDGER_KNOWLEDGE.md` per `docs/10_canon/context.md` §1).

## Determinism safeguards
- Verify no timestamps or nondeterministic APIs were added.

## STOP AND ASK
- If commit spans multiple phases or lacks ledger entry.
