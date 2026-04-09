# 2026-04-09 - Drift recall ownership precedence hardening

## Summary
- Hardened `recallDriftedBrigades(...)` so late T6 repair can reclaim movement ownership from stale generic movement orders when a brigade is ownerless and outside truthful same-corps sector space.
- Added regression coverage proving ownerless stranded brigades are redirected to `home_osid`, while same-corps and active-operation brigades keep their existing orders.
- Proved on the 40-week rerun that the Podrinje pair now carry truthful home-recall orders instead of an unrelated march toward `op:donji_vakuf:pribraca_2`, while the residual `brigade_far_from_home_unassigned` anomaly remains honestly visible.

## Why
- The prior lanes had already removed false foreign-corps ownership and aligned anomaly ownership, leaving `rs_1st_podrinje` and `rs_5th_podrinje` as the real residual ownerless-drift seam.
- In run `n1402`, both brigades finished at `op:banja_luka:banja_luka_2` with `assignment = null`, but their live `brigade_movement_orders` still pointed to `op:donji_vakuf:pribraca_2`.
- That meant T6 repair knew they were stranded, yet generic earlier movement authority still owned the actual order packet. The hardening target for this lane was to make repair truth win that authority conflict without broad movement redesign.

## Files changed
- `src/sim/turn_phases/war_phases.ts`
- `tests/drift_recall_precedence.test.ts`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## What changed
1. `src/sim/turn_phases/war_phases.ts` now exports `recallDriftedBrigades(...)` and adds `isWithinSameCorpsSectorSpace(...)` so the repair pass can distinguish truthful same-corps presence from genuine ownerless drift.
2. Existing move orders are no longer treated as absolute. If a brigade is ownerless, outside same-corps sector space, not in an active operation, and its current order is not already a home recall, the T6 repair pass now overwrites that order with a deterministic march back to `home_osid`.
3. `tests/drift_recall_precedence.test.ts` locks the authority boundary:
   - ownerless severe drift overrides stale generic movement
   - same-corps sector-space brigades keep their current move
   - active-operation brigades keep operation-owned movement

## Scenario proof

### Baseline
- Run: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1402`
- Hash: `701d14d32566c5b5`
- End-state truth for both `rs_1st_podrinje` and `rs_5th_podrinje`:
  - `location_osid = op:banja_luka:banja_luka_2`
  - `assignment = null`
  - `brigade_movement_orders.destination_sids[0] = op:donji_vakuf:pribraca_2`
- `end_report.md` contained:
  - `[brigade_far_from_home_unassigned] 2/213 (0.9%) ... rs_1st_podrinje ... rs_5th_podrinje`

### Post-fix rerun
- Run: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1403`
- Hash: `3e73da751bd457d9`
- End-state truth for both Podrinje brigades:
  - still `location_osid = op:banja_luka:banja_luka_2`
  - still `assignment = null`
  - but `brigade_movement_orders.destination_sids[0]` now points home:
    - `rs_1st_podrinje -> op:rogatica:rogatica_2`
    - `rs_5th_podrinje -> op:vlasenica:sebiocina`
- `end_report.md` still contains:
  - `[brigade_far_from_home_unassigned] 2/213 (0.9%) ... rs_1st_podrinje ... rs_5th_podrinje`

### Before / after difference
- Fixed: the live move-order owner for the Podrinje pair. Generic stray movement to `pribraca_2` is gone.
- Fixed: late drift repair now truthfully claims the movement packet for ownerless brigades outside same-corps space.
- Unchanged but clarified: the brigades still finish stranded and ownerless at Banja Luka, so `brigade_far_from_home_unassigned` remains a real residual seam rather than being papered over by nicer wording.
- Proven safe: `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1403` reports `Brigade Assignment: OK: 0 unresolved` and `Assignment Sync: OK: 0 missing`, so the lane hardened movement authority without creating a new assignment drift class.

## Determinism / ownership
- Determinism impact: controlled and deterministic. The new decision path only reads canonical state and adjacency, uses no timestamps or randomness, and preserves stable map writes.
- Canonical owner after cleanup: `recallDriftedBrigades(...)` in T6 repair owns the final move order when a brigade is ownerless and outside same-corps sector space.
- Demoted path after cleanup: stale generic `brigade_movement_orders` inherited from earlier movement phases for the same ownerless brigade.

## Verification
- `npx.cmd vitest run tests/drift_recall_precedence.test.ts tests/brigade_home_return.test.ts tests/elite_loan_return_to_corps.test.ts`
- `npm.cmd run sim:scenario:run:40w`
- `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1403`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

## Residual risks
- The Podrinje pair still end the run physically stranded and ownerless. This lane fixes who owns their movement order, not why the recall fails to complete in later turns.
- `brigade_far_from_home_unassigned` remains the truthful residual anomaly and should not be downgraded unless a later lane actually resolves or reclassifies the underlying state.

## Next lane
- Investigate why ownerless same-faction drift can remain stranded after truthful home recall orders exist, starting with the Podrinje pair's Banja Luka endpoint and the handoff between late repair, subsequent movement phases, and final anomaly surfaces.
