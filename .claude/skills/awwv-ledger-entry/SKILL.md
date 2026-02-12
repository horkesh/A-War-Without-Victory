---
name: awwv-ledger-entry
description: Append a PROJECT_LEDGER entry automatically. Use when the user runs /awwv_ledger_entry or when any change affects behavior, outputs, or scenarios — then write the entry into docs/PROJECT_LEDGER.md.
---

# /awwv_ledger_entry

## Trigger
Any change affecting behavior, outputs, or scenarios. User request for a ledger entry.

## Inputs
- Change summary, affected systems, tests run.

## Output
- **Append** the ledger entry to `docs/PROJECT_LEDGER.md` (edit the file). Place new entries at the **end** of the changelog (append-only; see `docs/10_canon/context.md` §1), using the same format as existing entries (date, summary, change, determinism/scope, artifacts).
- Include explicit determinism impact statement when the change touches simulation, pipeline, or serialization.
- **When the change carries reusable knowledge** (pattern, decision with rationale, failed approach or lesson): add or update the relevant section in `docs/PROJECT_LEDGER_KNOWLEDGE.md` and link to the ledger date. See `docs/PROJECT_LEDGER_IMPLEMENTATION_GUIDE.md` §6.

## Determinism safeguards
- Include explicit determinism impact statement for behavior/output changes.

## STOP AND ASK
- If change does not map to a phase.
