# Bot Orders Uncontested Candidate-Gates Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1836`
**Baseline:** n1835 defender-power residual profile split, hash `0cb626c032204372`
**Result:** Retained instrumentation-only split; n1836 kept final hash `0cb626c032204372`

## Summary

- Split `evaluateUncontestedOccupation(...)` candidate-gate timing into operational-prefix, controller, HRHB/RBiH alliance, and enclave guards.
- Preserved caller-specific profile prefixes for home-defense, standalone, and defensive callers.
- The new child labels are all small. The broad `.candidateGates` and `.candidateLoop` parents are nested-profiler inflated and should not drive optimization by themselves.

## Implementation

### Candidate Gate Children

- Added `.candidateGates.opPrefix` around the existing `op:` OSID prefix check.
- Added `.candidateGates.controller` around the political-controller read and friendly/empty rejection.
- Added `.candidateGates.alliance` around the existing HRHB/RBiH combat-enabled guard.
- Added `.candidateGates.enclave` around the existing enclave perimeter guard.

The gate order is unchanged: operational OSID, controller, alliance, enclave, then the existing salient, avoid-list, defender, and sector-defense checks.

### Test Guard

- `tests/bot_orders_perf_profile.test.ts` now verifies all four candidate-gate child labels.
- Red proof failed on missing `.candidateGates.opPrefix`; green proof passed after the instrumentation landed.

## Scenario Results

### 40w Profile

- Final state hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Home-Defense Caller

| Label | Time | Count |
|---|---:|---:|
| `homeDefense.uncontestedOccupation.candidateGates` | 126.395ms | 21,038 |
| `.candidateGates.controller` | 6.802ms | 21,038 |
| `.candidateGates.enclave` | 3.378ms | 5,960 |
| `.candidateGates.opPrefix` | 3.093ms | 21,038 |
| `.candidateGates.alliance` | 1.635ms | 7,836 |

### Standalone Caller

| Label | Time | Count |
|---|---:|---:|
| `eval.uncontestedOccupation.candidateGates` | 88.507ms | 15,265 |
| `.candidateGates.controller` | 4.854ms | 15,265 |
| `.candidateGates.enclave` | 2.265ms | 4,352 |
| `.candidateGates.opPrefix` | 2.213ms | 15,265 |
| `.candidateGates.alliance` | 0.953ms | 4,765 |

### Defensive Caller

| Label | Time | Count |
|---|---:|---:|
| `defensive.uncontestedOccupation.candidateGates` | 44.611ms | 7,867 |
| `.candidateGates.controller` | 1.847ms | 7,867 |
| `.candidateGates.opPrefix` | 1.044ms | 7,867 |
| `.candidateGates.enclave` | 0.572ms | 2,292 |
| `.candidateGates.alliance` | 0.441ms | 2,591 |

## Interpretation

- The broad candidate-gate parent increased under nested timers, but the actual child labels are single-digit milliseconds per caller.
- `controller` is the largest child, yet even the home-defense caller only spends 6.802ms there across 21,038 checks.
- The op-prefix, alliance, and enclave checks are too small to justify behavioral or data-structure changes from this evidence.

## Verification

- Red first: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` failed because `.candidateGates.opPrefix` was missing.
- Green focused guard: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` passed 5/5.
- Typecheck: `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1836 with final hash `0cb626c032204372`.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_attack.ts` | Adds candidate-gate child labels inside `evaluateUncontestedOccupation(...)`. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the new profile labels. |
| `docs/40_reports/implemented/20260515_BOT_ORDERS_UNCONTESTED_CANDIDATE_GATES_PROFILE_SPLIT.md` | Records n1836 results and interpretation. |

## Next Steps

- Do not optimize operational-prefix, controller, alliance, or enclave candidate gates from n1836 evidence.
- Treat broad `.candidateGates` and `.candidateLoop` totals as attribution wrappers when child timers are nested inside them.
- Pick the next CPU lane from a fresh top profile rather than extending this gate split.
