# Personnel Vacancy Read-Model Sync

**Date:** 2026-06-18
**Status:** Implemented
**Type:** UI/read-model polish

## Summary

Army HQ Personnel previously counted command vacancies from active assigned officers only. That contradicted the established opening commander read-model used by corps cards/OOB: turn-safe opening commanders can be displayed without mutating startup officer state, and the synthetic JNA Herzegovina command can show command staff without a named officer assignment.

The Personnel dossier now uses `resolveCorpsCommanderDisplay(...)` for vacancy detection. Genuine empty corps remain flagged, but read-model opening commanders and synthetic command displays no longer create false turn-0 vacancy alerts.

## Verification

- Red/green regression: `tests/ui/personnel_player_safe_display.test.ts`
- Focused pack: `npx.cmd vitest run tests/ui/opening_corps_commander_display.test.ts tests/ui/personnel_player_safe_display.test.ts tests/startup_snapshot_contract.test.ts --pool=forks --reporter=dot`
- Result: 3 files / 17 tests passed

## Scope

UI/read-model presentation and tests only. No simulation logic, startup artifact, scenario data, save schema, serialization, generated artifact, calibration floor, golden baseline, randomness, timestamp, persisted output ordering, or packaged installer artifact changed.
