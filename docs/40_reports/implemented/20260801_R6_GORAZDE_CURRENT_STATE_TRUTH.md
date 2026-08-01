# R6 Goražde current-state truth correction

**Date:** 2026-08-01  
**Workstream:** R6, Phase 0, Task 0.1  
**Comparison base:** `f3bace39874feb7aea2fdc6fa484d5aff4f9783b`  
**Status:** Implemented, independently approved, baseline-reconciled

## Outcome

`gorazde_pocket_consolidation_1992` no longer manufactures territorial history. Its August 1992 window remains eligible only after the live political-control map already records both `op:gorazde:glamoc` and `op:gorazde:kamen` as RBiH-held. The event then files its informational receipt, morale consequence, narrative, and durable flag without changing political-control bytes.

The Wikipedia-only citation and the absolute future claim remain deliberately untouched in this packet. R7 owns their sourced replacement; changing them here would mix gameplay truth with an unfinished historical-content review.

## Reproduced bug

Three red-first regressions proved the old row:

1. fired from a 30% Goražde municipality share even when both named settlements were RS-held;
2. failed to recognize the intended exact settlement state when the municipality-share shortcut was below threshold; and
3. authored a `control_change` for both settlements.

The pre-fix focused run failed 3/3. After replacing the weak predicate with an exact deterministic `and` of two `territory_control` conditions and deleting the `control_change`, the same 3/3 passed.

## Matched 40-week causal comparison

Both runs used `data/scenarios/apr1992_definitive_40w.json`, the same scenario id `1aa96054bcc8af09`, and the same source commit except for the event-data/test working-tree correction.

| Evidence | Pre-fix | Post-fix |
|---|---:|---:|
| Run | `apr1992_definitive_40w__1aa96054bcc8af09__w40_n0` | `apr1992_definitive_40w__1aa96054bcc8af09__w40_n92` |
| Final-save bytes | 5,071,275 | 5,070,902 |
| Final-save SHA-256 | `52ee1829aab62e5ede80ca461b0ec6cc1d5ecc8ac2e0700a36ea7229d6050bde` | `b28225e47b8e7ba563c4e836151fc8699f3cd191f4912c6c13ac7c099719fbd5` |
| Structural state hash | `52ee1829aab62e5e` | `b28225e47b8e7ba5` |
| Historical anchors | 31/31 | 31/31 |
| Control changes, total | 112 | 110 |
| Control changes, `other` | 3 | 1 |

The final-save diff is exactly 16 deleted lines: two redundant turn-18 event log rows that claimed `RBiH -> RBiH` self-transfers for Glamoč and Kamen. `initial_save.json`, `control_delta.json`, `activity_summary.json`, and `formation_delta.json` are byte-identical. The sole changed weekly-report row is turn 18's corrected attribution count; `run_summary.json` changes only those attribution totals and the bound final-state hash. No controller, formation, battle, casualty, displacement, activity, or historical-anchor result moved.

This is the expected and accepted baseline delta: false history was removed from the durable control-event record without scripting a replacement outcome.

## Golden 52-week causal review

The strict baseline harness correctly failed on `apr1992_52w`; the same harness passed unchanged on detached pre-fix commit `f3bace398`. Unlike the 40-week comparison seed, this scenario still has both named Goražde settlements RS-held during the event window. The corrected notification therefore does not fire, instead of forcing the two settlements and perturbing later operations from an invented state.

The deterministic cascade remains inside the recorded floor:

| Metric | Pre-fix | Post-fix |
|---|---:|---:|
| Core historical anchors | 30/31 | 31/31 |
| Six bot benchmark bands | 6/6 | 6/6 |
| Critical anomalies | 0 | 0 |
| Warning anomalies | 3 | 3 |
| Final control, RBiH / RS | 264 / 367 | 260 / 371 |
| Distinct settlement flips | 114 | 112 |
| Attack casualties, attacker / defender | 39,070 / 38,241 | 35,937 / 36,390 |
| Displacement | 1,086,299 | 1,086,185 |

The anchor improvement is independent of the two named settlements: `op:lukavac:brijesnica_donja_2` now remains with its expected RS controller. Glamoč and Kamen remain RS-held against their painted RBiH reference in this seed. That residual is evidence for later R6 combat/calibration work, not authority to restore a scripted takeover. Formation count, event timing, RNG rules, and calibration thresholds were not changed to chase the new output.

## Verification

- RED: `tests/gorazde_pocket_event_state_truth.test.ts` failed 3/3 against the old event.
- GREEN: the same core three tests passed after the correction; an explicit one-of-two conjunct guard brings the file to 4 tests.
- Final focused historical/event/canon matrix: 7 files / 113 tests passed.
- TypeScript: `npm.cmd run typecheck` passed.
- Diff hygiene: `git diff --check` passed at the implementation checkpoint.
- Strict baseline reconciliation: pre-fix detached HEAD passed; post-fix strict mode failed on the explained 52-week cascade; `UPDATE_BASELINES=1` updated only the `apr1992_52w` artifact hashes; a second strict run passed all scenarios.
- Independent historian/canon review: PASS for the event mechanics and baseline acceptance. The unsupported citation/prose remains an explicit, non-blocking R7 content finding.

## Scope

Event trigger/effect data, one regression test, deterministic baseline reconciliation, roadmap/board truth, this report, and the project ledger only. No event timing window, morale value, player decision, territorial result, RNG use, save schema, canon/FORAWWV, package, version, tag, signing, publication, or release state changes in this packet.
