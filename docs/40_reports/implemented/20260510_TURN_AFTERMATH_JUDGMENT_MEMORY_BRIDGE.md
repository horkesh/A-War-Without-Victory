# Turn Aftermath Judgment / Memory Bridge

**Date:** 2026-05-10
**Status:** IMPLEMENTED
**Roadmap lane:** Presidential product spine / Report -> Cost -> Judge -> Next

## Summary

Turn Aftermath now carries a compact judgment packet that tells the player whether the turn should be remembered as cost, signal, action pressure, territorial change, or quiet. The modal renders that packet as a Judgment / Memory panel and routes directly to Chronicle or Codex through existing shell navigation helpers.

## Files

- `src/ui/map/data/turnAftermath.ts`
- `src/ui/map/components/TurnAftermathModal.tsx`
- `src/ui/map/App.tsx`
- `tests/ui/turn_aftermath.test.ts`
- `tests/ui/gamestore_load_reset.test.ts`

## Behavior

- Critical/severe turn cost becomes a cost-memory judgment and prefers Chronicle / Codex.
- Strategic signals become a signal-memory judgment and prefer Chronicle / Codex.
- Pending desk work becomes an action-pressure judgment and prefers records / Chronicle.
- Territorial movement becomes a territory-memory judgment and prefers Chronicle / records.
- Quiet turns still produce an explicit no-judgment packet for stable UI and save-load fixtures.

## Verification

Red first:

- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts --reporter=dot` failed on missing `view.judgment`.

Green after implementation:

- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts --reporter=dot` passed 11/11.
- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts tests/ui_chronicle_turn_record_link.test.ts tests/ui_shell_navigation.test.ts tests/docs_desktop_v09_truth.test.ts --reporter=dot` passed 34/34 before fixture cleanup.

Final session verification was run before commit.

## Canon Posture

UI/read-model only. No simulation rule, event trigger, scenario data, save schema, historical claim, sensitive-history rupture, or Cost Ledger calculation changed.
