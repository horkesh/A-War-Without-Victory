---
name: docs-only-ledger-handling
description: Guides documentation-only edits with PROJECT_LEDGER handling and canon checks. Use when editing documentation without code changes.
---

> **Until 1.0:** `docs/PROJECT_LEDGER*`, `docs/ledger/`, `docs/plans/` and `docs/40_reports/` paths below mean `C:/Pyrrhic/AWWV-coordination/repo-docs/docs/<same path>` (owner ruling 2026-11-18). Read and edit them there; open no docs PRs. See `docs/20_engineering/AGENT_WORKFLOW.md`.

# Docs-Only Update With Ledger Handling

## When to use
Editing documentation without code changes.

## Instructions
1. Determine if the docs change affects behavior or workflow.
2. If yes, append an entry to `docs/PROJECT_LEDGER.md` (changelog).
3. If the change documents a pattern, decision, or reusable lesson, add or update the relevant section in `docs/PROJECT_LEDGER_KNOWLEDGE.md` and link to the ledger date (see `docs/10_canon/context.md` §1).
4. Ensure docs align with canon and invariants.
5. If canon conflict is found, STOP AND ASK.

## Must never
- Modify `FORAWWV.md`.
- Change canon documents without explicit request.
