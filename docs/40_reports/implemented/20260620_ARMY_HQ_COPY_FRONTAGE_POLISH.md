# Army HQ Copy and Front-Segment Polish

## Summary
Army HQ still carried a few compact staff shorthands after the broader player-copy sweep. Combat records, corps cards, ORBAT campaign losses, and sector frontage rows now render player-facing labels instead of abbreviations or misleading kilometer wording.

## Changes
- Army HQ corps combat records now use the shared combat-record i18n copy for record breakdowns and ground won/lost counts instead of `2W / 1L / 1D` and `+3 / -1`.
- Corps cards now render localized stance labels and full brigade/sector/personnel words instead of `OFF`/`DEF`/`BAL`/`REORG`, `BRG`, `SEC`, `Pers`, `Brg`, or `Sec`.
- ORBAT expanded brigade campaign losses now spell out killed, wounded, and missing/captured counts instead of `KIA / WIA / MIA`.
- Army HQ sector rows now treat `length_edges` as front segments, not kilometers, including the expanded density row and the collapsed summary line.
- Added GUI audit coverage for the four leak classes so the shorthand does not return.

## Verification
- Focused GUI audit passed: `npm.cmd exec -- vitest run tests/ui/gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` (13/13).
- Typecheck passed: `npm.cmd exec -- tsc --noEmit --pretty false`.
- Diff hygiene passed: `git diff --check`.
- Player-journey gate passed: `npm.cmd run qa:player-journeys` (234/234).
- Live browser sweep passed: `npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`), and `.tmp_live_surface_browser_sweep` was removed afterward.

## Scope
UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
