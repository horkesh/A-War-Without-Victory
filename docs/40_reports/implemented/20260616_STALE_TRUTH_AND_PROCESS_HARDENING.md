# Stale Truth and Process Hardening

## Summary

This batch closes four independent comment-sweep / Pyrrhic specialist findings while the prior main CI was running:

- `engine-health-188w` now reports an explicit red result when its upstream `scenarios` dependency fails or is skipped.
- Sarajevo siege UI read-models no longer trust stale serialized `last_contained_osids_by_faction.RS` alone; they also require current political-control truth for the RBiH-held Sarajevo urban core.
- Decision consequence records no longer derive reserve brigade or officer corps display copy from raw internal ids when authored names are absent.
- `docs/life_lessons.md` and topic files are back in sync for the June 15 D2-legibility lessons.

## Scope

- `.github/workflows/baseline-regression.yml`
- `src/ui/map/data/sarajevoSiege.ts`
- `src/ui/map/components/SituationTab.tsx`
- `src/ui/map/components/chronicle/sarajevoSiegeChronicle.ts`
- `src/ui/map/data/decisionConsequenceLedger.ts`
- `tests/sarajevo_siege_legibility.test.ts`
- `tests/ui/decision_consequence_trail.test.ts`
- `tests/ui/decision_consequence_records_panel.test.ts`
- `docs/life_lessons.md`
- `docs/life_lessons/process.md`
- `docs/life_lessons/calibration.md`

## Verification

- `npx.cmd vitest run tests\sarajevo_siege_legibility.test.ts tests\ui\decision_consequence_trail.test.ts tests\ui\decision_consequence_records_panel.test.ts --pool=forks --reporter=dot` -> 3 files / 35 tests passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` -> 11 files / 102 tests passed.
- `npx.cmd prettier --check .github\workflows\baseline-regression.yml` passed.

No simulation logic, scenario data, save schema, calibration floor, golden baselines, or packaged installer artifacts changed.
