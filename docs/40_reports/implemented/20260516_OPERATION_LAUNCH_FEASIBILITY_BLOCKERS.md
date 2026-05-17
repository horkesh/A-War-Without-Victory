# Operation Launch Feasibility Blockers - n1842 H1

**Date:** 2026-05-16
**Run evidence:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1842/`; post-fix verification `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844/`
**Source track:** `docs/plans/2026-05-16-engine-health-n1842-plan.md` H1
**Status:** IMPLEMENTED - VERIFIED BY FOCUSED TESTS, BUILDS, AND n1844 DIAGNOSTICS; SENSITIVE-HISTORY OUTCOME STILL OPEN

## Summary

- Added a shared pure `evaluateLaunchFeasibility(...)` path that returns `feasible`, `ratio`, `attackerPower`, `defenderPower`, and a typed `blocker`.
- Launch feasibility now compares attacker power against defender power that includes the same defender-aware combat inputs used by `rankDefendersByPower(...)`, instead of collapsing late failure into generic planning invalidation.
- Organic operation launch/readiness, triggered-operation spawn, and diagnostics now expose `defender_power_too_high` and `no_launch_readiness` blockers.

## Changes Made

### Shared Feasibility Evaluator

`src/sim/combat/sector_offensive_launch_helpers.ts` now owns the pure `evaluateLaunchFeasibility(...)` implementation. It uses sorted attacker/defender inputs, `computeAttackerPower(...)`, and `rankDefendersByPower(...)`, with optional supply and terrain context where the caller can provide it.

`checkLaunchFeasibility(...)` remains the wrapper for existing sector-offensive launch callers. The wrapper preserves the existing call shape while returning blocker-aware readiness data.

### Operation Readiness And Spawn Paths

Organic launch/readiness paths now surface the blocker that stopped launch. Triggered-operation spawn also reports the same blocker vocabulary, so a strong defender at the launch target becomes `defender_power_too_high` instead of a generic `planning_invalidated` result.

The implementation deliberately did not add opportunity spawn gating. Current opportunity fixtures/catalog paths do not provide enough front-sector context to evaluate launch feasibility at proposal time. Opportunity operations are instead caught at their first planning tick, where the same blocker-aware feasibility path has the required context.

### Diagnostics

The following diagnostics now expose launch blockers so post-run reports can distinguish "not ready" from "defender too strong":

- `tools/diagnostics/operation_delivery_audit.cjs`
- `tools/diagnostics/opportunity_campaign_proof.cjs`
- `tools/diagnostics/sensitive_history_status.cjs`

This is the key closeout for the n1842 audit complaint: operation failures should now leave an honest predicate instead of disappearing behind readiness/planning ambiguity.

## Scenario Results

Post-fix 188w run `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844` completed with final hash `ccd3f9f770052614`.

`tools/diagnostics/operation_delivery_audit.cjs` now emits typed blockers in the op-level and per-axis tables. n1844 per-axis predicate counts:

- `NO-LAUNCH-READINESS`: 5 axes, down from 13 in n1842.
- `DELIV`: 6 axes, stable vs n1842.
- `DEFENDER-POWER-HIGH`: 9 axes, newly split from generic planning/readiness failure.
- `NO-OPENING-ATTACK`: 3 axes, down from 4.
- `NO-CONTACT-PATH`: 2 axes, stable.
- `UNDERDELIV`: 5 axes.
- `PRE-FRIENDLY`: 6 axes.

This closes the silent-failure part of H1: non-launching operations now say whether they lacked launch readiness or faced excessive defender power. It does **not** close sensitive-history outcome acceptance. `sensitive_history_status.cjs` on n1844 still reports `OPEN_P0`; Krivaja-95, Stupcanica-95, and Cerska-Kamenica are missing from watched-operation AAR output rather than delivering captures or failing with a blocker. That is a follow-up sensitive-history/catalog injection problem, not the original H1 blocker-surface bug.

## Verification

Parent-reported focused verification:

- H1 focused suite passed: 12 files, 127 passed, 4 skipped.
- Full typecheck passed after the parent fixed movement-order typing.
- `npm.cmd run desktop:sim:build` passed with the existing `import.meta` CJS warning.
- `npm.cmd run desktop:map:build` passed with existing Vite/browser-external/dynamic-import/chunk warnings.
- `npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs` produced n1844, final hash `ccd3f9f770052614`.

Coverage called out by the H1 implementation includes:

- `tests/operation_launch_feasibility_defender_aware.test.ts`
- `tests/sector_offensive_launch_gates.test.ts`
- `tests/sector_offensive_idle_recovery.test.ts`
- `tests/operation_delivery_audit_predicate_split.test.ts`
- `tests/opportunity_campaign_proof_diagnostic.test.ts`
- `tests/sensitive_history_status_diagnostic.test.ts`

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/sector_offensive_launch_helpers.ts` | Shared pure launch-feasibility evaluator and wrapper |
| `src/sim/combat/sector_offensive.ts` | Organic launch/readiness uses blocker-aware feasibility |
| `src/sim/combat/triggered_operations.ts` | Triggered-op spawn exposes launch blockers |
| `src/sim/combat/bot_brigade_ai_osid.ts` | Readiness/planning path consumes blocker-aware launch feasibility |
| `tools/diagnostics/operation_delivery_audit.cjs` | Emits blocker detail in operation-delivery audit output |
| `tools/diagnostics/opportunity_campaign_proof.cjs` | Emits blocker detail for opportunity proof diagnostics |
| `tools/diagnostics/sensitive_history_status.cjs` | Emits blocker detail for sensitive-history diagnostics |
| `tests/operation_launch_feasibility_defender_aware.test.ts` | Defender-aware launch-feasibility regression |
| `tests/operation_delivery_audit_predicate_split.test.ts` | Predicate split regression |
| `tests/opportunity_campaign_proof_diagnostic.test.ts` | Opportunity diagnostic blocker regression |
| `tests/sensitive_history_status_diagnostic.test.ts` | Sensitive-history blocker regression |

## Next Steps

- Keep Q-H1-KRIVAJA-OUTCOME open, but reframe it as a watched-operation injection/catalog/AAR visibility lane: n1844 did not produce watched Krivaja/Stupcanica/Cerska rows.
- DELIV did not improve in n1844, so the next operation-delivery lane should focus on turning honest blockers into feasible operations or authored no-go decisions rather than restoring generic planning invalidation.
