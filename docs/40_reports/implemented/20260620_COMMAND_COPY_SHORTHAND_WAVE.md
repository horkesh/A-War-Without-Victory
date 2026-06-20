# Command Copy Shorthand Wave

## Summary
Closed the next player-copy slice from the Pyrrhic raw-copy scout. Remaining normal command surfaces now spell out staff abbreviations across Army HQ, Operation History, Situation, Corps Front, Corps Detail, Personnel, the ops modal, and EN/BCS catalogs.

## Changes
- Army HQ and Operation History exchange ratios now render a no-friendly-losses sentence instead of `INF`.
- Situation and Operation History casualty rows spell out killed, wounded, and missing/captured instead of `KIA / WIA / MIA`.
- Corps Front and Corps Detail display `length_edges` as front segments instead of approximate kilometers.
- Sector and personnel summaries spell out intelligence, defense per front segment, morale, fatigue, personnel, brigade, and command-authority copy instead of compact `INTEL`, `DEF/EDGE`, `MOR`, `FAT`, `PERS`, `brg`, `bde`, `AUTH`, or BCS `AUT`/`brig.` fragments.
- BCS command surfaces now use full operation-security and operational-report language instead of `OPSEC` / `SITREP`.
- Ops modal unit-type labels and low-confidence warnings now use readable player copy instead of all-caps shorthand.
- GUI audit coverage now pins the new EN/BCS copy boundaries.

## Verification
- Focused GUI audit passed: `npm.cmd exec -- vitest run tests/ui/gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` (14/14).
- Focused GUI + Decision Room stale-expectation pack passed: `npm.cmd exec -- vitest run tests/ui/gui_audit_label_discipline.test.ts tests/ui/presidential_decision_room.test.ts --pool=forks --reporter=dot` (51/51).
- Typecheck passed: `npm.cmd exec -- tsc --noEmit --pretty false`.
- Diff hygiene passed: `git diff --check`.
- Player-journey gate passed: `npm.cmd run qa:player-journeys` (234/234).
- Live browser sweep passed: `npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`), and `.tmp_live_surface_browser_sweep` was removed afterward.

## Scope
UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
