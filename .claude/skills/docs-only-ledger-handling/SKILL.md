---
name: docs-only-ledger-handling
description: Guides documentation-only edits with PROJECT_LEDGER handling and canon checks. Use when editing documentation without code changes.
---

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
