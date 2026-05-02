# Operation Storm Theater Gate Split

**Date:** 2026-05-01
**Branch:** `codex/storm-theater-gate`
**Baseline:** Current main after combat-math defender-modifier foundation (`8b5a2902`) plus LANE E 5th Corps predicate topology.
**Result:** Storm precondition readiness is no longer treated as actual western-theater rupture.

## Summary

- Split Operation Storm into two deterministic truths: abstract preconditions aligned, and actual `operation_storm_1995` event fired.
- Updated 5th Corps opportunity predicates so Una/Breza/Pauk remain pre-Storm defensive-crisis opportunities until the event fires, while Sana requires the event-opened western theater.
- Verified fresh 40w, 104w, and 188w runs. The 188w proof now surfaces all seven 5th Corps opportunities, including the three T3 defensive sentinels that LANE E exposed as blocked.

## Root Cause

LANE E found that Una 94, Breza 94, and Pauk 94/95 were blocked because `state.meta.operation_storm_triggered` became true before w113, while the narrative Operation Storm event fired at w174. The old flag conflated two different concepts:

- **Precondition readiness:** Washington signed, RS threat high enough, combined RBiH/HRHB exhaustion high enough, IVP momentum high enough.
- **Theater rupture:** the actual Operation Storm event has fired and the Croatian/western theater has opened.

The first concept is useful pressure-state evidence. The second is the only truth that should close pre-Storm defensive crises or unlock Sana-style exploitation.

## Changes Made

### Theater Truth Helper

Added `src/sim/combat/operation_storm_theater.ts`:

- `OPERATION_STORM_EVENT_ID`
- `getOperationStormEventTurn(state)`
- `hasOperationStormEventFired(state)`
- `isWesternTheaterRuptured(state)`
- `isPreStormWesternTheater(state, turn)`

These helpers centralize the meaning of the Storm event so future opportunity families do not read raw meta flags ad hoc.

### Operation Storm Check

`src/sim/combat/operation_storm.ts` now:

- Records `operation_storm_preconditions_met` and `operation_storm_precondition_turn` when abstract thresholds align.
- Sets `operation_storm_triggered` and `operation_storm_turn` only after `operation_storm_1995` event truth exists.
- Reports `event_fired`, `event_turn`, and `preconditions_recorded` in `OperationStormCheckReport`.

### Consumers

- `src/sim/combat/operation_opportunity_catalog_5th_corps.ts`
  - Sana reads `isWesternTheaterRuptured(state)`.
  - Una/Breza/Pauk read `isPreStormWesternTheater(state)`.
- `src/sim/compile_turn_summary.ts`
  - Emits the Operation Storm notable event from event/theater truth rather than precondition readiness.
- `src/state/game_state.ts`
  - Documents the split meta fields.

### Tests

Added `tests/operation_storm_theater_gate.test.ts`:

- Precondition-ready state records readiness without opening the theater before the event.
- Event-fired state opens the western theater and records the event turn.

Updated 5th Corps opportunity fixtures so `operationStormTriggered` / `stormTriggered` in tests means the `operation_storm_1995` event has fired, preserving backward-shaped fixtures while aligning predicates with the new helper truth.

## Scenario Results

| Checkpoint | Run | Hash | Storm readiness | Theater rupture | Painted compare |
|---|---|---:|---|---|---|
| 40w | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n5` | `c6677e7ea3c7d3a4` | false | false | Jan1993 91.3% / 93.3% area |
| 104w | `runs/apr1992_definitive_104w__13abfd609800bba2__w104_n3` | `9dc1a087c86a99e1` | true at w85 | false | Apr1994 82.6% / 79.6% area |
| 188w | `runs/apr1992_definitive_188w__210e69404d054959__w188_n4` | `164ea509d7168b24` | true at w85 | true at w174 | Oct1995 70.8% / 63.2% area |

The 104w hash changes because the save now records the additive precondition-readiness meta field. It does not open the western theater or surface Storm-dependent opportunities.

## 188w Opportunity Health

`node tools/diagnostics/opportunity_health_audit.cjs runs/apr1992_definitive_188w__210e69404d054959__w188_n4`

| Turn | Opportunity | Exit | AAR | Outcome | Objectives |
|---:|---|---|---|---|---:|
| 113 | APWB Pressure 94 | `decisive_success` | yes | success | 5/5 |
| 113 | Tigar-Sloboda 94 | `decisive_success` | yes | success | 4/4 |
| 113 | Una 94 | `t3_authorized_no_offensive` | no | n/a | 0/0 |
| 125 | Breza 94 | `t3_authorized_no_offensive` | no | n/a | 0/0 |
| 133 | Grmec 94 | `failed` | yes | failure | 0/6 |
| 135 | Pauk 94/95 | `t3_authorized_no_offensive` | no | n/a | 0/0 |
| 175 | Sana 95 | `failed` | yes | failure | 0/31 |

Health summary: 7 decisions, 7 approvals, 7 completed, 2 successes, 3 T3 defensive sentinels, 0 unlinked approved offensive resolutions, 0 broken AAR links, 0 duplicate proposal-resolution rows.

## Diagnostics

`node tools/diagnose_run.cjs runs/apr1992_definitive_188w__210e69404d054959__w188_n4`:

- 0 errors, 35 warnings.
- Sarajevo siege health OK.
- Gorazde siege health OK with 2 brigades near target.

`node tools/validate_run_consistency.cjs runs/apr1992_definitive_188w__210e69404d054959__w188_n4`:

- 18 failures remain.
- Failure class: known war-front faction-side coverage / one empty contested sector in the sector layer.
- Undefended front subsegments and adjacent uncontested territory checks are clean.

## Determinism

Preserved. The change introduces no randomness, timestamps, locale sorting, or unstable iteration. The new helper reads existing event arrays/maps and meta fields. Scenario hashes change because the save shape and opportunity decisions change intentionally.

## Remaining Work

1. Grmec 94 and Sana 95 still show the combat-execution gap: high-level opportunities can launch but fail to deliver captures in late-war Krajina.
2. October 1995 painted-target match is still 63.2% area-weighted. This lane fixes opportunity truth and timing, not combat delivery or HRHB western operations.
3. The validate consistency sector-layer failures remain a separate sector/front coverage lane.
4. Future late-war opportunity families should use `operation_storm_theater.ts` helpers instead of raw Storm meta fields.
