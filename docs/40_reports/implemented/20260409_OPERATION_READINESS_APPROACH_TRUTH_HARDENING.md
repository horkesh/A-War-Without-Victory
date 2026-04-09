# Operation Readiness Approach-Truth Hardening

**Date:** 2026-04-09
**Status:** COMPLETE
**Lane:** Engine operation readiness approach-truth

## Candidate seams considered

1. Runtime execution-quality seam in `cmd_arbih_1st_corps_t18`
2. Military review shell coherence between `App.tsx` and Army HQ / `presidentialReviewQueue`
3. Blindspot review of whether the runtime seam was true hardening or only tuning

The runtime seam won. It was the highest-value bounded step because fresh 40-week proof still showed wrong combat-causality truth in the sim itself, while the UI seam was downstream shell ownership work. Under the hardening order, wrong runtime truth outranks shell coherence.

## Exact seam chosen

`src/sim/combat/sector_offensive.ts` used two different truth surfaces for the same launch decision:

- planning/readiness used coarse sector-subsegment approach membership
- execution used graph-valid objective adjacency from the live OSID front graph

That mismatch let `cmd_arbih_1st_corps_t18` enter execution in run `n1397` even though no participating brigade could ever produce a graph-valid attack path to the target objective. The operation then sat in execution with zero eligible attackers and died as `no_logged_attempt`.

## Root cause

- Canonical owner after cleanup: objective-specific approach truth derived from `war_front_edges_osid` adjacency in `src/sim/combat/sector_offensive.ts`
- Demoted path after cleanup: coarse sector-subsegment membership as execution-readiness authority

The old planning helper unioned every friendly-side OSID in the sector subsegments touching the target objectives. In sectors where one subsegment touched multiple hostile OSIDs, that made non-adjacent rear brigades look "ready" even though the brigade-side executor only permits attacks from graph-adjacent friendly approaches.

## Implementation

Changed `src/sim/combat/sector_offensive.ts` so planning and execution now read the same approach truth:

1. Renamed the old coarse helper to `collectSectorSubsegmentApproachOsids(...)`.
2. Added a new `collectObjectiveApproachOsids(...)` that builds OSID adjacency from `war_front_edges_osid`, walks the current objectives in order, and returns only graph-adjacent friendly or friendly-allied approach OSIDs for the first reachable objective.
3. Kept a narrow compatibility fallback to the old coarse helper when sparse test states do not populate front-edge adjacency.
4. Updated `areParticipantsReadyForExecution(...)` and `reconcilePlanningObjectives(...)` to use the new graph-valid approach helper.
5. Threaded `faction` through the readiness call sites so friendly/allied control checks are evaluated against the real operation owner.

## Tests

Added a targeted regression in `tests/sector_offensive_idle_recovery.test.ts`:

- `invalidates planning when coarse subsegment membership makes non-adjacent brigades look execution-ready`

The test locks the exact seam: a sector subsegment claims rear approach OSIDs and one valid approach OSID against the same objective, but the front graph only connects the valid approach. Before the fix, the operation could look ready and survive into execution. After the fix, it cleanly recovers as `planning_invalidated`.

## Verification

### Targeted verification

- `npx.cmd vitest run tests/sector_offensive_idle_recovery.test.ts tests/sector_offensive.test.ts tests/bot_operation_objective_focus.test.ts tests/scenario_operation_diagnostics.test.ts`
- `npm.cmd run sim:scenario:run:40w`

### Full verification bar

- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

All passed after the fix.

## Scenario proof

### Baseline

- Run: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1397`
- Final save hash: `165ac7e6b2ca5ba4e0d9f24a751f633619a4ff52f7873756b07f4042cb5a2207`
- End report: `cmd_arbih_1st_corps_t18` finished as `★★☆☆☆ ... 0/1 obj ... failure`
- Operation weekly truth:
  - turns 18-22: `planning`
  - turns 23-27: `execution`
  - turn 28: `recovery` with `recovery_reason: "no_logged_attempt"`
- Behavioral-health counters:
  - `invalid_operation_count: 2`
  - `zero_eligible_attacker_operation_count: 1`
  - `recovery_without_logged_attempt_count: 1`
- Explicit anomaly present:
  - `[operation_zero_eligible_execution] Operation "cmd_arbih_1st_corps_t18" ... completed with 0 total attacks`

### Post-fix rerun

- Run: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1398`
- Final save hash: `bcd00cb1cf4339b9076f63f45083e0bb64dedb289b68293a7668ceb4db9a0b59`
- End report: `cmd_arbih_1st_corps_t18` finished as `★★★☆☆ ... 0/2 obj ... failure`
- Operation weekly truth:
  - turns 18-22: `planning`
  - turn 23: `recovery` with `recovery_reason: "planning_invalidated"`
  - it never entered execution
- Behavioral-health counters:
  - `invalid_operation_count: 0`
  - `zero_eligible_attacker_operation_count: 0`
  - `recovery_without_logged_attempt_count: 0`
- The old `operation_zero_eligible_execution` anomaly for `cmd_arbih_1st_corps_t18` no longer appears
- Follow-on improvement visible in the same rerun:
  - `cmd_arbih_1st_corps_t24` finished as `★★★★★ ... 1/1 obj ... success`
  - `total_attacks: 1`

### Before/after difference

- The seam no longer graduates a graph-impossible assault into fake execution
- `cmd_arbih_1st_corps_t18` now fails honestly during planning instead of polluting combat-causality truth with a zero-eligible execution
- Scenario-level behavioral-health counters improved from `2/1/1` to `0/0/0` for invalid ops / zero-eligible attackers / recovery-without-attempt
- The hardening clarified the substrate rather than just moving wording around: planning and execution now read the same objective-approach contract

## Ownership after cleanup

- Canonical owner: `src/sim/combat/sector_offensive.ts` graph-valid objective approach truth built from `war_front_edges_osid`
- Player-visible truth after cleanup: operations no longer present themselves as live executable assaults when the executor cannot legally attack from any participating brigade's approach
- Canonical UI surface after cleanup: unchanged downstream surfaces (`operation_aars`, scenario diagnostics, end report) now inherit cleaner sim truth instead of compensating for it

## Files

- `src/sim/combat/sector_offensive.ts`
- `tests/sector_offensive_idle_recovery.test.ts`

## Residual risks

- The next runtime seam is now `cmd_vrs_east_bosnian_t29` in `n1398`; this lane removed the `cmd_arbih_1st_corps_t18` false-execution class but did not prove all named-operation execution-quality issues are closed.
- Military review shell coherence in `App.tsx` remains open and should be revisited after the next runtime re-baseline unless runtime evidence proves a higher-value seam first.

## Follow-on

Best next bounded lane: investigate `cmd_vrs_east_bosnian_t29` as the remaining top runtime seam in `n1398`, with a blindspot check against the still-open military review shell ownership lane.
