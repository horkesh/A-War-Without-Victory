# HV 1995 Engine Resolution and Evidence Harness

**Date:** 2026-08-22
**Branch:** `codex/hv-1995-timing-mobility`
**Run ID:** `apr1992_definitive_188w__9e902ad68783fbe7__w188_n236`
**Baseline:** `n235`, 637/712, 31/31 anchors, `aaeed1e8d0439859`
**Result:** scoped engine defects resolved; 637/712, 31/31 anchors, `f3ee13afaee32e9d`

## Summary

- Kept all six `spawn_turn: 174` edits and both live `hv_phantom` movement admissions in the same tree. Neither half was separated.
- Built a permanent artifact-driven lifecycle/cascade harness with positive controls for spawn, temporal presence, movement intent and execution, operation membership, battle stacks, opportunity rosters, objective filtering, movement rejection, AARs, controller dependencies, and operation-reference integrity.
- Repaired the measured engine cascade: stale reserve `dig_in`; synthetic OOB-key resolution; main-staff opportunity admission and loan retention; and shared authored-ID resolution across opportunity, triggered, pre-planned, and validation paths.
- Did not refresh or edit the baseline manifest. Restored the tracked latest-run save byte-for-byte after every 188-week run.

## Changes Made

### Atomic timing and movement

- `src/sim/combat/jna_phantom_brigades.ts`: the six 1995 HV expeditionary formations spawn at turn 174; live phantom lifecycle/movement gates admit `hv_phantom` alongside the existing JNA path where applicable.
- `src/sim/combat/osid_column_movement.ts`: active `hv_phantom` formations can enter column movement. JNA phantom behavior is not broadened.
- Commit `c2333a900` owns the coupled timing/mobility change and is an ancestor of the final tree.

### Movement-state repair

- `src/sim/combat/army_reserve_system.ts`: an accepted reserve deployment that issues movement changes stale `dig_in` posture to `defend` and clears dig-in progress. This prevents T5 deployment from handing T3 an order it must reject.
- Movement-rejection reason codes provide the positive control: earlier traces recorded `posture_dig_in`; repaired HV movement records real orders, transit, and movement events.

### Authored operation roster repair

- `src/sim/combat/operation_formation_resolver.ts`: exact live formation keys win; otherwise exactly one sorted `oob:<authored id>` match resolves to the live key; ambiguity is rejected rather than arbitrarily selected.
- The shared resolver is used by opportunity, triggered, pre-planned, and injection-validation paths.
- Main-staff roster admission and loan-truth retention defaults are enabled. An authored sector-exempt elite can enter an opportunity through an explicit loan; reconciliation no longer retains an unloaned free rider.

### Permanent harness

- `npm run diagnose:hv1995 -- <run-dir> --write` writes `hv_1995_lifecycle_diagnostic.json` inside the run directory.
- Absence is never reported from a zero alone. Each projection carries a positive control, and the operation-reference audit classifies warnings as alias-backed false missing, ambiguous alias, not-yet-spawned, exact-present-later, or genuinely absent.
- The Trnovo warning originally described as true missing was corrected by temporal evidence: warning at turn 69, first live observation at turn 140, operation membership at turn 141.

## Scenario Results

| Run | Isolated change | Matched | Anchors | Hash |
|---|---|---:|---:|---|
| n230 | diagnostic baseline before reserve movement repair | 609 | 31/31 | `1eaa3f381072db96` |
| n231 | clear stale reserve `dig_in` on accepted movement deployment | 607 | 31/31 | `b5c1a503ac0e5ab6` |
| n232 | opportunity-roster diagnostics only | 607 | 31/31 | `010e21ba80349cca` |
| n233 | opportunity OOB-alias resolution | 638 | 31/31 | `05ef15d4eceb52ad` |
| n234 | main-staff opportunity admission default on | 637 | 31/31 | `aaeed1e8d0439859` |
| n235 | main-staff loan-truth retention default on | 637 | 31/31 | `aaeed1e8d0439859` |
| n236 | shared resolver across all authored operation paths | 637 | 31/31 | `f3ee13afaee32e9d` |

`n234` and `n235` final saves have identical SHA-256 `AAEED1E8D0439859A7EDEDF2E667ADC24B6B511454A2E852B69B2F09A5EBEC8E`. This establishes that the retention default is behaviorally inert in that repaired run, not merely equal in matched-cell count.

### Late-war cascade at n236

| Operation | Result | Attacks | Captured |
|---|---|---:|---:|
| Cincar / Kupres | success / completed | 5 | 5/5 |
| Mistral 1 | partial / max failures | 7 | 7/11 |
| Mistral 2 | success / completed | 12 | 11/11 |
| Southern Move | executing at turn-188 boundary | 6 through boundary | 5/6 |

All five dependency checks used by the harness end HRHB: Bučovača for Mistral 1 and 2, Glamoč for Mistral 2, and Šipovo plus Pribeljci for Southern Move.

### Formation evidence

- All six delayed formations spawned once and were present in the temporal trace.
- `hv_112th_infantry_1995` recorded six movement-order turns, three transit turns, four movement events, eleven operation turns, and two full-stack battle hits.
- Five formations recorded no operation membership. The operation-membership projection had a positive control, so that absence is established. Current live catalogs do not author those five into a reachable post-turn-174 operation roster; no conclusion is drawn that their movement executor is broken.

### Reference-integrity evidence

- n235 positive case: Farz 95 warned `arbih_328th_mountain` missing while `F_RBiH_0001` carried `oob:arbih_328th_mountain`.
- n236: alias-backed false missing count `0`; ambiguous alias count `0`.
- Farz 95 participants changed from three authored exact-key formations to five live formations including `F_RBiH_0001`; it still completed all four objectives.
- The remaining `brigade_missing` warning is Trnovo pre-spawn observability, not an alias-resolution failure.

## Verification

- Focused engine and harness suites: 207/207 passed across movement, reserve loans, opportunity, triggered, pre-planned, validation, reconciliation, and diagnostics.
- TypeScript typecheck passed.
- `git diff --check` passed.
- n236 completed 188 turns with every harness positive control true.
- `data/derived/latest_run_final_save.json` restored to SHA-256 `A9EBCEA481BDE4FEF0E69FAC119E124812922247C1D07F19D95A3F8BF2BE1E4C`; no backup remained.
- `data/derived/scenario/baselines/manifest.json` was not refreshed and has no diff.
- Independent review is still required before promotion because the implementer cannot serve as reviewer.

## Lessons Learned

- Final-save identity alone cannot explain a warning emitted 119 turns earlier; temporal evidence changed Trnovo from “true missing” to “not yet spawned.”
- A successful operation can conceal a silently omitted participant. Farz completed in n235 despite the engine dropping a real brigade.
- Exact matched-cell parity can conceal a real state change, while equal failure counts can conceal changed CI artifacts. Hashes and typed boundary receipts are both necessary.
- The five non-participating HV formations now stop at an authored-content boundary. Treating that as an engine defect without a catalog reference would repeat the original hypothesis-first failure.

## Files Changed

| Area | Files |
|---|---|
| Timing/movement | `jna_phantom_brigades.ts`, `osid_column_movement.ts`, war-pipeline comments/tests |
| Movement state | `army_reserve_system.ts` and tests |
| Operation identity | `operation_formation_resolver.ts`, opportunity/triggered/pre-planned/validation paths and tests |
| Main-staff loans | `mainstaff_op_availability_gate.ts`, opportunity/reconciliation paths and tests |
| Diagnostics | `hv_1995_lifecycle.ts`, reason-code traces, state validation, diagnostic tests |

## Next Steps

1. Obtain independent review of the final branch before promotion.
2. Keep the manifest frozen until baseline ownership deliberately chooses new pins; n236 is evidence, not an automatic golden floor.
3. Treat any proposal to add the other five delayed HV formations to operation catalogs as a separate historical/content calibration, one change and one run at a time.
