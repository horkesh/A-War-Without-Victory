# HV 1995 Timing, Mobility, and CI Resolution

**Date:** 2026-08-22
**Branch:** `codex/hv-1995-timing-mobility`
**Base:** `a945771c2450ef242b156040ed779be6ea8bb494`
**Run ID:** `apr1992_definitive_188w__9e902ad68783fbe7__w188_n227`
**Result:** candidate implementation verified; calibration not promoted

## Summary

- The inherited CI anomaly was a comparison error. The two failed CI runs had the same 16 mismatch count, but three 188-week actual hashes changed; CI did exercise the merged HV history corrections.
- The live definitive-scenario movement walls are `osid_column_movement.ts` and `brigade_movement_orders.ts`, not the non-operational fallback mover. Both now admit `hv_phantom`, and the six 1995 formations move from turn 150 to turn 174 in the same tree.
- One controlled 188-week run scored **609/712 matched OSIDs with 31/31 anchors**. Three of six HV formations recorded movement, none appeared in 637 full-stack battle records, and Mistral 2 never became eligible. This is worse than the verified pre-change ancestor artifact and is not a new calibration floor.
- The silent friendly-objective filter now has deterministic, env-gated `objective_filter` diagnostics on the existing opportunity trace. The field is absent when the gate is disabled.

## CI and Manifest Investigation

CI runs `32532844577` and `32050627175` both reported 16 baseline mismatches across the 188-week and 52-week scenarios. They were not byte-identical:

| 188w artifact | Older actual | Newer actual | Result |
|---|---|---|---|
| `final_save.json` | `8bb624eb…` | `034820889…` | changed |
| `run_summary.json` | `4714f473…` | `822ddef2…` | changed |
| `weekly_report.jsonl` | `4984854f…` | `2034fdcf…` | changed |

The remaining 13 actual hashes and all expected hashes were unchanged. A comparator positive control replaced one hash with a fake value and detected exactly one difference. The newer CI `final_save.json` actual matches the local post-history-correction hash reported in the handoff. The workflow caches npm dependencies only; the scenario and comparison steps run directly.

Conclusion: the persistent red count masked changed outputs. CI exercised the merge. `data/derived/scenario/baselines/manifest.json` was not refreshed or edited.

## Changes Made

### Coupled timing and movement repair

- `jna_phantom_brigades.ts`: all six 1995 HV expeditionary definitions now spawn at turn 174; the withdrawal guard comment follows the same boundary.
- `osid_column_movement.ts`: active `hv_phantom` formations may enter column transit. `jna_phantom` remains excluded from new column transit.
- `brigade_movement_orders.ts`: active `hv_phantom` formations may execute adjacent movement orders.
- `war_phases.ts`: the pipeline comment now names the Storm/turn-174 anchor.

The timing and both live movement executors are deliberately one atomic tree. Neither half should be separated.

### Friendly-objective diagnostics

- Added reason-code topic `objective_filter`.
- When enabled, opportunity lifecycle traces record friendly objectives rejected without an override: axis, objective OSID, controller, acting faction, and reason.
- Records are copied and sorted with `strictCompare` by `axis_id`, then `objective_osid`.
- The optional payload is validated on load. It is absent—not null or empty—when the topic is disabled.

## Scenario Results

### Historical fit and control

| Metric | Result |
|---|---:|
| Matched OSIDs | **609 / 712** |
| Historical anchors | **31 / 31 pass** |
| Final-state hash | `260700c127941ea5` |
| HRHB control | 84 vs reference 107 |
| RBiH control | 302 vs reference 289 |
| RS control | 326 vs reference 316 |

Against provenance-bearing pre-change ancestor run `n225`, 12 final controllers differ. In the western subset, the candidate ends with two Glamoč and four Šipovo cells RS-held that were HRHB-held in `n225`; one Šipovo cell moves RS→HRHB. This comparison is not an isolated A/B and does not assign the changes to one sub-edit.

### HV movement and combat participation

Recorded movements:

- `hv_141st_reserve_brigade_1995`: Tomislavgrad → Donji Malovan at turn 175; Donji Malovan → Vidimlije at turn 179.
- `hv_1st_hgz_1995`: Livno → Vidimlije at turn 175.
- `hv_7th_hgr_1995`: Livno → Vidimlije at turn 175.

The other three wave formations had no recorded movement. The full-stack checker saw 637 instrumented battle records and found zero appearances by a 1995 HV formation; its positive control found a non-empty attacker stack in all 637 records. No claim is made about the 25 battle-like weekly rows that lacked the full-stack field.

Mistral 2 remained blocked through turn 188 because its Kupres/Cincar staging anchors never opened. The pre-change ancestor artifact launched it at turn 182. Southern Move also remained blocked on Šipovo staging control.

### Other run totals

- Defender-present battles: 561; defender-absent battles: 76.
- Orders processed: 868; flips applied: 139.
- Final personnel: HRHB 68,641; RBiH 217,772; RS 81,125.

## Verification

- Red TDD run: 3 intended failures and 34 passing controls for timing, HV column movement, and HV adjacent movement.
- Coupled focused movement/timing tests: 37/37 passed.
- Final focused set: 107/107 passed.
- Independent corrected-diagnostics rerun: 70/70 passed.
- TypeScript typecheck: passed.
- `git diff --check`: passed.
- Independent reviewer: ready; no Critical or Important findings after corrections.
- Tracked `data/derived/latest_run_final_save.json` was backed up before the 188-week run and restored byte-for-byte afterward (`A9EBCEA4…` before and after).
- `manifest.json` and tracked latest-run save: no diff.

The broad `test:vitest:fast` attempt is **inconclusive**. It emitted many passing files, then a CPU-bound worker ran for roughly 40 minutes and exited 1 without a final failure summary in the retained output. It is not reported as either green or a characterized regression comparison.

## Lessons Learned

- Equal failure counts do not imply equal CI outputs; compare artifact hashes directly.
- The definitive scenario routes operational-data movement through column and adjacent-order executors. The fallback mover is not a live wall for this scenario.
- Enabling a formation kind in an executor proves reachability, not meaningful operation participation. The run moved only half the wave and none joined a full-stack battle.
- An engine-health repair may worsen historical fit. The 609 result must remain visible rather than being reframed as success.

## Files Changed

| Area | Files |
|---|---|
| Coupled repair | `jna_phantom_brigades.ts`, `osid_column_movement.ts`, `brigade_movement_orders.ts`, `war_phases.ts` |
| Diagnostics | `operation_opportunities.ts`, `reason_code_debug.ts`, `validateGameState.ts` |
| Tests | phantom, movement, opportunity diagnostics, reason-code gate, state validation suites |
| Process | execution plan, napkin, calibration master, project ledger, this report |

## Next Steps

1. Owner decides whether to retain the healthier movement path despite the measured 609 calibration and Mistral-2 regression.
2. If retained, investigate why only three wave formations receive/execute movement and why none enter resolved battle stacks; do not tune map outcomes until the mechanism is understood.
3. Obtain a characterized broad-suite comparison before merge.
4. Reconcile golden pins only as a separate deliberate task; never regenerate them from this candidate run by implication.
