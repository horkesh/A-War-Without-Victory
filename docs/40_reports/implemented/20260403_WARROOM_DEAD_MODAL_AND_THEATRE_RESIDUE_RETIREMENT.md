# 2026-04-03 - Warroom dead modal and theatre residue retirement

## Summary
- Removed the unused `OperationalSituationModal` path from Warroom.
- Deleted `src/state/theatres.ts`, which had become a fully dead theatre compatibility helper module with no live imports.
- Tightened Warroom help text so it describes the current shell hierarchy instead of older local packet ownership.
- Hardened the legacy-honesty test suite so these dead paths cannot quietly come back.

## Why
- Both paths were dangerous because they still looked alive:
  - `OperationalSituationModal` still existed as a plausible Warroom packet even though the desk map anchor had long since routed directly to the tactical shell.
  - `src/state/theatres.ts` still looked like a respectable compatibility helper even though no live pipeline, shell, or runtime importer still used it.
- In this repo, those are exactly the files that mislead future cleanup and feature work: they look coherent enough that an agent will wire the wrong thing back in.

## Files changed
- Deleted:
  - `src/ui/warroom/components/OperationalSituationModal.ts`
  - `src/state/theatres.ts`
- Updated:
  - `src/ui/warroom/ClickableRegionManager.ts`
  - `src/ui/warroom/warroom.ts`
  - `tests/engine_honesty_legacy_contracts.test.ts`
  - `docs/40_reports/GUI_MASTER.md`
  - `docs/40_reports/WARROOM_MASTER.md`
  - `docs/PROJECT_LEDGER.md`
  - `docs/PROJECT_LEDGER_KNOWLEDGE.md`

## Implementation notes
- `ClickableRegionManager` no longer imports or exposes `OperationalSituationModal`.
- Warroom help copy now says what the room really does:
  - flag/coatrack = executive summary then Army HQ handoff
  - journal = Army HQ records handoff
  - report stack = Army HQ operations record
- `engine_honesty_legacy_contracts.test.ts` now asserts:
  - no live `OperationalSituationModal` path remains in Warroom wiring
  - live source files no longer import `state/theatres.ts`
  - `src/state/theatres.ts` itself is gone

## Verification
- `node .\node_modules\vitest\vitest.mjs run tests\engine_honesty_legacy_contracts.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Outcome
- Warroom no longer carries a dead desk-map modal that competes with the real tactical-shell handoff.
- The repo no longer advertises a fake theatre helper module as if theatre tagging were still a plausible runtime lane.
- The living shell/docs/test layer now tells one cleaner truth about this part of the product.
