# Batch 3 Morale And Exhaustion Drift Audit

Date: 2026-05-18
Lane: design/data cleanup
Scope: `combat_math.ts`, `bilateral_ceasefire.ts`, `washington_agreement.ts`, focused morale/exhaustion/alliance lifecycle tests

## Decision

### `FACTION_MORALE_RESIST_FLOOR`

Decision: document as intentional doctrine; do not promote to scenario data in this lane.

Rationale:
- `src/sim/combat/combat_math.ts` exposes the sole read path through `getMoraleResistFloor(faction)`.
- `docs/10_canon/Systems_Manual_v0_9_0.md` already documents the current doctrine: RBiH=50, RS=55, HRHB=60.
- `tests/attack_morale_absorption.test.ts` covers RS floor behavior at and below 55, HRHB floor behavior at 60, and the outcome boundary where decisive victory still retreats.
- The only drift found was a stale local canon line in `docs/10_canon/Engine_Invariants_v0_9_0.md` listing RS=70. That line was corrected to RS=55. `docs/10_canon/FORAWWV.md` was not edited.

Follow-up: none for data promotion. If future design wants scenario-specific morale floor variants, add a data owner and migration plan first; the current asymmetry is stable doctrine, not an undocumented hardcode.

### `CEASEFIRE_*_EXHAUSTION` and `WASH_COMBINED_EXHAUSTION`

Decision: do not retune these thresholds blindly in this lane; mark the backlog row as verified with a concrete timing drift follow-up.

Current constants:
- `CEASEFIRE_RBIH_EXHAUSTION = 30`
- `CEASEFIRE_HRHB_EXHAUSTION = 35`
- `WASH_COMBINED_EXHAUSTION = 55`

Evidence:
- Focused tests in `tests/alliance_lifecycle.test.ts` verify threshold wiring by importing the constants, setting exhaustion just over the thresholds, and asserting ceasefire/Washington fire only when all preconditions pass.
- Current 188w probe `runs/apr1992_definitive_188w__210e69404d054959__w188_n1868/final_save.json` has:
  - `war_started_turn = 36`
  - `ceasefire_since_turn = 81`
  - `washington_turn = 85`
  - final `RBiH` and `HRHB` exhaustion both approximately `100.001821`
- The same probe's `weekly_report.jsonl` records the narrative event `washington_agreement_1994` at `week_index = 102`.
- Historical/canon timing in local plans and reports treats Washington as March 1994, approximately week 102.

Interpretation:
- Drift is confirmed between live agreement state (`washington_turn = 85`) and current narrative event timing (`week_index = 102`).
- The named exhaustion thresholds are not the binding cause of that drift in the current run: exhaustion is already saturated long before the live agreement state fires.
- The current live trigger is effectively controlled by `war_started_turn + CEASEFIRE_MIN_WAR_DURATION + WASH_CEASEFIRE_DURATION` (`36 + 45 + 4 = 85`), while the narrative milestone remains week 102.

Required follow-up:
- Reconcile the live RBiH-HRHB agreement state with the calendar/narrative `washington_agreement_1994` milestone.
- The narrow candidates are:
  - recalibrate `CEASEFIRE_MIN_WAR_DURATION` / `WASH_CEASEFIRE_DURATION` against current war-start timing, or
  - split the early mechanical ceasefire/recovery state from the formal Washington Agreement milestone if design wants pre-March military effects.
- Do not solve this by changing `CEASEFIRE_RBIH_EXHAUSTION`, `CEASEFIRE_HRHB_EXHAUSTION`, or `WASH_COMBINED_EXHAUSTION` alone unless a new run proves exhaustion becomes the binding gate after duration/event alignment.

## Verification

Commands run for this audit:
- `npx.cmd vitest run tests\attack_morale_absorption.test.ts tests\alliance_lifecycle.test.ts tests\combat_exhaustion.test.ts tests\washington_joint_pressure.test.ts` - PASS, 4 files / 71 tests.
- `npm.cmd run typecheck` - PASS during parent Batch 3 integration after sibling lanes completed.

## Files

- Updated `docs/10_canon/Engine_Invariants_v0_9_0.md` to align the RS morale retreat resistance floor with code, tests, and Systems Manual.
- Added this audit report.
