# 2026-04-09 - Unresolved sector anomaly owner alignment

## Summary
- Rewired `unassigned_frontline_brigades` to read the final sim-owned `military.unresolved_sector_brigades` list instead of reconstructing an older “corps has sectors” heuristic.
- Updated anomaly regressions so descriptive fixed-home brigades only trigger the critical when the canonical unresolved list says they truly fell through the sector pipeline.
- Proved on the 40-week rerun that the six HVO Central Bosnia false positives disappear, while the real residual seam remains visible as `brigade_far_from_home_unassigned` for the Podrinje pair.

## Why
- `collectUnresolvedSectorBrigades(...)` and final sector reconciliation already own the truth for brigades that truly fell through sector assignment.
- `detectUnassignedFrontlineBrigades()` was still rebuilding a retired rule from local heuristics (`corpsWithSectors`, assigned set, op participants), which produced eight critical deployment failures in `n1401` even though `final_save.json` had `unresolved_sector_brigades = []`.
- That duplicate owner mixed two different things together:
  - six HVO Central Bosnia home-defense brigades that are not sector-mandatory in the final state
  - the real ownerless-drift seam for `rs_1st_podrinje` and `rs_5th_podrinje`

## Files changed
- `src/scenario/anomaly_detector.ts`
- `tests/anomaly_detector_deployment_truth.test.ts`
- `tests/integration_anomaly.test.ts`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## What changed
1. `detectUnassignedFrontlineBrigades(...)` now reads `state.military.unresolved_sector_brigades` as its canonical source instead of independently deciding that any active brigade in a corps with sectors is a critical failure.
2. The detector no longer needs to care about descriptive placement tags, local sector membership heuristics, or active-operation filtering for this anomaly; the final sector builder already resolved those questions upstream.
3. Targeted tests now prove both sides of the contract:
   - a canonically unresolved brigade still reports even if it carries `placement:fixed_home_osid`
   - an unassigned fixed-home brigade with an empty canonical unresolved list does **not** trigger the critical just because its corps has sectors elsewhere
4. The integration anomaly suite now asserts that `unassigned_frontline_brigades` exactly matches `unresolved_sector_brigades`.

## Scenario proof

### Baseline
- Run: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1401`
- Hash: `701d14d32566c5b5`
- `final_save.json` had:
  - `military.unresolved_sector_brigades = []`
- But `end_report.md` still contained:
  - `[unassigned_frontline_brigades] 8 active brigade(s)... hrhb_94th_brigade ... hrhb_95th_brigade ... hrhb_ban_jelai_brigade ... hrhb_kiseljak_brigade ... hrhb_kreevo_brigade ... hrhb_travnik_brigade ... rs_1st_podrinje ... rs_5th_podrinje`
- That was a direct owner conflict: the builder said “zero unresolved,” the detector said “eight critical unresolved.”

### Post-fix rerun
- Run: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1402`
- Hash: `701d14d32566c5b5` (unchanged simulation outcome)
- `final_save.json` still has:
  - `military.unresolved_sector_brigades = []`
- `end_report.md` no longer contains `unassigned_frontline_brigades`
- `run_summary.json` still contains the truthful residual seam:
  - `brigade_far_from_home_unassigned` `2/213 (0.9%) ... rs_1st_podrinje ... rs_5th_podrinje ...`

### Before / after difference
- Fixed: the anomaly detector no longer invents unresolved sector failures when the final sector owner says there are none.
- Fixed: the six HVO Central Bosnia home-defense brigades are removed from the critical deployment failure bucket.
- Clarified: the Podrinje pair remain visible, but only under the correct ownerless-drift signal.
- Proven safe: `n1401` and `n1402` share the same final hash, so the lane changed only truth ownership/reporting, not gameplay behavior.

## Determinism / ownership
- Determinism impact: controlled and deterministic. The detector now consumes an already sorted, sim-owned list instead of re-deriving a second doctrine.
- Canonical owner after cleanup: `military.unresolved_sector_brigades`, populated by final sector truth reconciliation.
- Demoted path after cleanup: anomaly-local `corpsWithSectors + unassigned + not-in-op` reconstruction.

## Verification
- `npx.cmd vitest run tests/anomaly_detector_deployment_truth.test.ts tests/integration_anomaly.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run sim:scenario:run:40w`
- `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1402`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npm.cmd run build`

## Residual risks
- `rs_1st_podrinje` and `rs_5th_podrinje` are still genuine ownerless drift. This lane intentionally leaves them visible rather than forcing them into the wrong anomaly bucket.
- `brigade_far_from_home_unassigned` is now the main residual signal for the next drift/recall lane; silencing that without fixing runtime ownership would be dishonest.

## Next lane
- Investigate ownerless Drina drift for `rs_1st_podrinje` and `rs_5th_podrinje`, focusing on why recall / return-to-corps truth still leaves them stranded at `op:banja_luka:banja_luka_2` with no live owner.
