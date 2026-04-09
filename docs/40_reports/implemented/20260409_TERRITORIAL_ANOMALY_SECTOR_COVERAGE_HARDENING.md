# 2026-04-09 - Territorial anomaly sector-coverage hardening

## Lane title

Align territorial anomaly warnings with canonical sector coverage truth.

## Candidate seams considered

- `undefended_painted_mismatch` still treating covered-empty OSIDs as ownerless territory
- `adjacent_uncontested_territory` still treating covered-empty OSIDs as walk-ins
- `brigade_stacking` overcalling same-sector front co-location
- `arbih_444th_mountain` pocket-tip exposure at Konjic
- `rs_1st_podrinje` / `rs_5th_podrinje` stranded lifecycle ownership

## Exact seam chosen

`checkUndefendedPaintedMismatch(...)` and `checkAdjacentUncontestedTerritory(...)` in `src/scenario/anomaly_checks_extended.ts` were still using physical brigade presence as the only defense signal, even when the sim already owned sector-level defense coverage via `corps_front_sectors`.

## Why this was the highest-value bounded step

This was still wrong now, still downstream of an existing sim-owned truth owner, and still provable with no gameplay drift. The remaining stranded-brigade and 444th seams are not in that category: Podrinje is redesign-blocked lifecycle ownership, while 444th is salient-risk doctrine rather than false persisted truth.

## Canonical owner after cleanup

Sector coverage truth in `state.military.corps_front_sectors`, backed by assigned/reserve brigade ownership and sector `territory_osids` / `sub_segments[*].friendly_osids`.

## Demoted path after cleanup

Physical on-tile brigade presence as the sole definition of "defended."

## Player-visible truth after cleanup

The anomaly layer no longer claims that every covered-but-empty tile is undefended. Only the genuinely uncovered residuals remain.

## Canonical reporting surface after cleanup

`runAnomalyDetection(...)` downstream reports in `run_summary.json` and `end_report.md`.

## Files changed

- `src/scenario/anomaly_checks_extended.ts`
- `tests/territorial_anomaly_sector_coverage_truth.test.ts`
- `docs/40_reports/implemented/20260409_TERRITORIAL_ANOMALY_SECTOR_COVERAGE_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Implementation

1. Added shared helpers to distinguish:
   - active brigade physical presence
   - sector-owned defense coverage
2. Updated `checkUndefendedPaintedMismatch(...)` to treat a tile as defended when the sim-controlling faction has either:
   - a brigade physically present, or
   - a live sector with active assigned/reserve coverage over that OSID
3. Updated `checkAdjacentUncontestedTerritory(...)` to use the same canonical defense predicate before applying the adjacency walk-in test.
4. Added focused regression tests proving covered-empty OSIDs are suppressed while truly uncovered OSIDs still report.

## Scenario / anomaly proof

Baseline:

- `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1409`
- final hash `bde31c0aab141f42`
- `undefended_painted_mismatch`: `56`
- `adjacent_uncontested_territory`: `111`

Post-fix:

- `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1410`
- final hash `bde31c0aab141f42`
- `undefended_painted_mismatch`: `2`
- `adjacent_uncontested_territory`: `9`

Before / after difference:

- `undefended_painted_mismatch` dropped `56 -> 2`
- `adjacent_uncontested_territory` dropped `111 -> 9`
- the remaining residuals are concentrated on genuinely uncovered live edges such as `op:gorazde:kolovarice` / `op:gorazde:podkozara_donja_2`
- final state hash stayed identical, proving the lane hardened reporting truth without changing simulation behavior

## Verification

- `npx.cmd vitest run tests/territorial_anomaly_sector_coverage_truth.test.ts`
- `npx.cmd vitest run tests/anomaly_detector_deployment_truth.test.ts tests/integration_anomaly.test.ts`
- `npm.cmd run sim:scenario:run:40w`
- `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1410`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

## Residual risks

- `brigade_stacking` still likely overcalls same-sector front co-location and remains the next bounded anomaly-contract candidate
- `arbih_444th_mountain` remains a realism / doctrine salient-risk concern, not a truth-owner defect
- `rs_1st_podrinje` / `rs_5th_podrinje` remain redesign-blocked lifecycle ownership gaps

## 444th investigation status

The Konjic pocket-tip concern was rechecked during this cycle. `arbih_444th_mountain` remains sector-owned at `op:konjic:sitnik`, still has friendly connectivity back toward Jablanica, and is not part of this anomaly-contract seam. That concern remains a future doctrine/salient-risk lane, not a hardening contradiction.
