# HV 1995 Engine Resolution and Evidence Harness

**Date:** 2026-08-22
**Branch:** `codex/hv-1995-timing-mobility`
**Run ID:** `apr1992_definitive_188w__9e902ad68783fbe7__w188_n239`
**Baseline:** `n238`, 637/712, 31/31 anchors, `7e9dc5cce015640d`
**Result:** scoped engine defects resolved; 634/712, 31/31 anchors, `55a0d578686dbd56`

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

### Elite-loan contract hardening

- Opportunity and pre-planned rosters now use the reserve pool's canonical availability predicate: an elite is rejected when permanently degraded, inside the four-turn recall cooldown, or already loaned. A live loan to the proposed host is still a commitment and cannot be double-rostered into a concurrent operation.
- The per-turn elite-loan tick applies the same commitment rule. It auto-joins a newly executing host operation only when the brigade belongs to no other live operation in any corps; it no longer bypasses the opportunity/pre-planned selectors on the following turn.
- `deployEliteLoan` defends the same invariant and returns explicit success/failure. Desktop approval rejects cooldown before command-authority debit or request consumption. Desktop redirect uses a transactional retask primitive: invalid routes leave military state byte-identical; a valid route closes the old episode and opens the new host commitment without being defeated by the recall cooldown created inside the transaction. Retask preserves the brigade's physical location, so the route validated from its current position remains the route the deployment order uses.
- The desktop retask path does not run in the headless scenario. Desktop-level red/green tests establish its caller behavior; clean n238 establishes the headless same-host double-commitment correction.

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
| n237 | enforce canonical elite-loan availability in opportunity, pre-planned, and deployment paths | 637 | 31/31 | `50be25fe9efb67ae` |
| n238 | reject a live same-host elite loan from a second concurrent operation | 637 | 31/31 | `7e9dc5cce015640d` |
| n239 | prevent the per-turn loan tick from reattaching a committed elite to another operation | 634 | 31/31 | `55a0d578686dbd56` |

`n234` and `n235` final saves have identical SHA-256 `AAEED1E8D0439859A7EDEDF2E667ADC24B6B511454A2E852B69B2F09A5EBEC8E`. This establishes that the retention default is behaviorally inert in that repaired run, not merely equal in matched-cell count.

Provenance limitation: every retained `n230`–`n236` `run_meta.json` records `git_dirty: true`, and the reason-code environment selection was not stamped. The commit sequence and session procedure support the table's intended one-change sequence, but the retained artifacts do not independently establish the exact dirty paths or flags. `n237` closes the clean-tree gap: `run_meta.json` records `git_dirty:false` at commit `c7459228a`, and the task record pins `AWWV_DEBUG_REASON_CODES=battle_stack,brigade_state,formation_lifecycle,movement_reject,objective_filter,opportunity_roster`.

The n236→n237 final-save delta is exactly one leaf: Mistral 2's already-loaned `hvo_2nd_guard_mechanized` rejection reason changes from `unreachable_to_host_corps` to the earlier and more accurate `elite_loaned_to_other_corps`. Activity, control delta, formation delta, weekly report, and brigade temporal artifacts are byte-identical. This establishes that the availability hardening changes diagnostic classification in this scenario but not its simulated military outcome.

The n237→n238 change is behaviorally active. At turn 175, `hvo_1st_guard_abb` already had a live loan to `hvo_tomislavgrad`; n237 nevertheless admitted it to Mistral 2 as another roster attachment. n238 rejects that second commitment as `elite_committed_to_host_corps`, reducing Mistral 2 initial strength from 12,059 to 9,259 and its weekly brigade count from five to four. Mistral 2 still succeeds 11/11 on the same turn window. The final save has 754 changed leaves through the resulting combat cascade and the weekly report hash changes; activity summary, control delta, and formation delta remain byte-identical. This is not an inert diagnostic-only change.

The n238→n239 change closes the independent per-turn bypass and is broader: 38,311 final-save leaves change, together with activity, control, and weekly artifacts; formation delta remains byte-identical. Matched OSIDs fall 637→634, while all 31 anchors and every hard health gate remain green. Mistral 2 changes from 11/11 success to 9/11 partial. This is the measured cost of enforcing one live operation commitment through the tick, and it is intentionally reported rather than hidden behind the unchanged hard-gate result.

### Late-war cascade at n239

| Operation | Result | Attacks | Captured |
|---|---|---:|---:|
| Cincar / Kupres | success / completed | 5 | 5/5 |
| Mistral 1 | partial / max failures | 7 | 7/11 |
| Mistral 2 | partial / completed | 12 | 9/11 |
| Southern Move | executing at turn-188 boundary | 6 through boundary | 5/6 |

All five dependency checks used by the harness end HRHB: Bučovača for Mistral 1 and 2, Glamoč for Mistral 2, and Šipovo plus Pribeljci for Southern Move.

### Formation evidence

- All six delayed formations spawned once and were present in the temporal trace.
- `hv_112th_infantry_1995` recorded six movement-order turns, three transit turns, four movement events, eleven operation turns, and two full-stack battle hits.
- Five formations recorded no operation membership. The operation-membership projection had a positive control, so that absence is established. Four have no current authored catalog entry; `hv_7th_hgr_1995` is authored for Mistral 1, but that opportunity window closes at turn 170 before its required turn-174 spawn. None has a reachable post-turn-174 roster; no conclusion is drawn that their movement executor is broken.

### Reference-integrity evidence

- n235 positive case: Farz 95 warned `arbih_328th_mountain` missing while `F_RBiH_0001` carried `oob:arbih_328th_mountain`.
- n236: alias-backed false missing count `0`; ambiguous alias count `0`.
- Farz 95 participants changed from three authored exact-key formations to five live formations including `F_RBiH_0001`; it still completed all four objectives.
- The remaining `brigade_missing` warning is Trnovo pre-spawn observability, not an alias-resolution failure.

## Verification

- Focused engine, desktop reserve, and harness suites include explicit invalid-loan and atomic-failure coverage across movement, reserve loans, opportunity, triggered, pre-planned, validation, reconciliation, and diagnostics.
- TypeScript typecheck passed.
- `git diff --check` passed.
- n239 completed 188 turns from clean commit `fa40bf566` (`run_meta.json` records `git_dirty:false`) with every harness positive control true, including the corrected spawn and battle-stack controls.
- The n239 188-week engine-health gate passed every hard check: zero-eligible ops 0/3, dead ops 0/6, ghost-destroyed 1/4, stranded brigades 6/9, consistency failures 0/3, and matched OSIDs 634/622 minimum. Advisory K:W was inside band at 3.728.
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
3. Treat any proposal to add the four uncatalogued delayed HV formations, or to reconcile the 7th HGR's pre-spawn Mistral 1 window, as separate historical/content calibration, one change and one run at a time.
