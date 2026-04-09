# 2026-04-09 - Brigade Stacking Sector Truth Hardening

## Lane

- Lane title: `fix(harness): align brigade stacking with sector truth`
- Candidate seams considered:
  - residual `brigade_stacking` false positives across same-sector front stacks
  - `frontline_density_imbalance` residuals
  - ownerless Podrinje stranded pair
  - `arbih_444th_mountain` salient/cutoff investigation
- Exact seam chosen:
  - `detectBrigadeStacking(...)` still treated canonically covered same-sector frontline co-location as suspicious stacking

## Why this lane won

- It was still wrong-now anomaly truth.
- The sim already owned enough truth to fix it without inventing a new packet or authority.
- It directly reduced noisy anomaly volume while preserving the real residual ownerless stack (`rs_1st_podrinje`, `rs_5th_podrinje`).

## Ownership cleanup

- Canonical owner after cleanup:
  - `state.military.corps_front_sectors[*]` coverage (`territory_osids` + `sub_segments[*].friendly_osids`) combined with brigade `assignment.sector_id`
- Demoted path after cleanup:
  - raw “2+ brigades on one OSID means suspicious stack” heuristic
- Player-visible truth after cleanup:
  - same-sector front concentrations no longer surface as fake stacking anomalies
  - the only remaining stack warning is the ownerless Podrinje pair at `op:banja_luka:banja_luka_2`
- Canonical UI/reporting surface after cleanup:
  - scenario anomaly reporting via `runAnomalyDetection(...)`, `run_summary.json`, and `end_report.md`

## Files changed

- `src/scenario/anomaly_detector.ts`
- `tests/brigade_stacking_sector_truth.test.ts`
- `docs/40_reports/implemented/20260409_BRIGADE_STACKING_SECTOR_TRUTH_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Implementation summary

1. `detectBrigadeStacking(...)` now builds deterministic OSID-to-sector coverage from canonical sector truth before classifying stacks.
2. Same-sector co-location is now exempt only when:
   - every brigade is a same-sector `front` brigade
   - every brigade shares the same `assignment.sector_id`
   - that sector canonically covers the OSID
3. `tests/brigade_stacking_sector_truth.test.ts` locks both sides of the contract:
   - same-sector covered front stack is suppressed
   - ownerless Podrinje co-location still reports

## Scenario / anomaly proof

- Baseline:
  - `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1410`
  - final hash: `bde31c0aab141f42`
  - `brigade_stacking`: `26 OSID(s) have 2+ brigades stacked (non-exempt)...`
- Post-fix:
  - `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1412`
  - final hash: `bde31c0aab141f42`
  - `brigade_stacking`: `1 OSID(s) have 2+ brigades stacked (non-exempt): op:banja_luka:banja_luka_2(2: rs_1st_podrinje,rs_5th_podrinje).`
- Before/after difference:
  - fake same-sector stacks removed: `26 -> 1`
  - final scenario hash unchanged
  - residual stack stayed visible, so the lane hardened anomaly truth instead of hiding the real stranded-brigade seam

## Verification

- `npx.cmd vitest run tests/brigade_stacking_sector_truth.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`
- `npm.cmd run sim:scenario:run:40w`
- `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1412`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`

All commands passed on the final post-change state.

## Board notes

- `arbih_444th_mountain` was investigated during this run and remains demoted:
  - it is exposed at a salient tip, but not cut off in final state
  - this is a doctrine / target-selection realism seam, not a truth-owner hardening seam
- Podrinje strandedness remains redesign-blocked:
  - no canonical owner exists yet for same-faction ownerless unreachable brigades after collapse

## Residual risks

- `frontline_density_imbalance` is still present and likely needs metric-contract work, not simple suppression
- Podrinje stranded lifecycle ownership remains unresolved
- some large concentrations such as `op:jajce:grdovo` still exist, but they are no longer mixed together with same-sector front truth

## Next lane

- Next bounded candidate: anomaly certainty/wording hardening for residual warning buckets (`frontline_density_imbalance`, territorial residuals, and `brigade_never_fights`) if the post-commit board still supports a bounded report-truth lane
