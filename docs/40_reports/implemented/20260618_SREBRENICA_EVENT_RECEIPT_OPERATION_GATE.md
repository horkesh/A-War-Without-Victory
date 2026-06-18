# Srebrenica/Zepa Event Receipt Operation Gate

**Date:** 2026-06-18
**Type:** Canon/simulation trigger hardening plus scenario-copy/docs sync

## Summary

Owner correction: Srebrenica and Zepa fall through the sensitive-history event system, not through Krivaja-95 or Stupcanica-95 operation delivery. This slice makes that rule executable. The late-1995 operation-context rows now require the matching event receipt before they can trigger:

- `Operation Krivaja-95` requires `srebrenica_falls_1995`.
- `Operation Stupcanica-95` requires `zepa_falls_1995`.

If the event path misses, the operations cannot become an alternate fall-delivery mechanism. They remain chronology/AAR context unless a future Section 6-reviewed design explicitly changes that.

## Code And Data

- `src/sim/combat/triggered_operations.ts` now checks fired-event receipts through `fired_event_ids`, `event_fire_counts`, or `event_last_fired_turn`.
- Focused triggered-operation tests prove Krivaja/Stupcanica do not inject via either Army HQ or legacy paths before the receipt exists.
- `docs/10_canon/HISTORICAL_TIMELINE_MASTER.md` corrects the May 1992 Srebrenica note: Srebrenica was initially seized and then recaptured by ARBiH on 8-10 May.
- `data/scenarios/events/war_1992.json` replaces the RS strategic-goal copy "The Drina valley will be cleared" with declared-objective wording.

## Verification

- `npx.cmd vitest run tests\triggered_operations.test.ts tests\triggered_operations_late_1995.test.ts --pool=forks --reporter=dot` passed 2 files / 29 tests.
- `npx.cmd vitest run tests\ui\event_decision_modal_catalog.test.ts --pool=forks --reporter=dot` passed after the stale raw-source expectation was updated to sanitized dossier copy.
- Final combined focused bundle passed 3 files / 30 tests.
- `npm.cmd run qa:player-journeys` passed 11 files / 105 tests.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run ci:structural-fingerprint:check` passed and preserved `f282883abbab76cf`.
- `git diff --check` passed.

## Determinism And Calibration

The change is deterministic and uses already persisted event receipt state. No randomness, timestamps, save schema, serialization format, generated artifacts, golden baselines, or packaged installer artifacts changed. The 40w window remains before the affected t170/t172 gates. 188w behavior can intentionally change only where previous Krivaja/Stupcanica rows would have appeared without their fall events.
