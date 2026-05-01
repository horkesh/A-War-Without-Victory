# VRS Equipment Decay Floor Fix

Date: 2026-05-01
Branch: `codex/equipment-decay-audit`
Scope: bounded engine-health fix for VRS heavy-equipment maintenance collapse

## Executive Verdict

The historian P0 was real. The engine had two overlapping equipment models:

1. `formation.equipment_decay`, a canon scalar that decays VRS equipment effectiveness from week 26 and floors at 0.60.
2. `formation.composition.{tank_condition,artillery_condition}`, live combat/readiness condition fractions.

The scalar floor survived correctly, but the routine `equipment-degradation` phase kept shifting tank/artillery condition from operational to degraded/non-operational with no floor. By 188w the baseline had RS active brigades at `equipment_decay ~= 0.60`, while actual live heavy support was `tank_op=1` and `art_op=14`. That made the VRS nearly equipment-empty in combat and operation-readiness terms, contradicting the intended "degraded but still capable" late-war arc.

The fix wires the existing timeline floor into routine condition degradation only. Combat losses, capture, abandonment, write-offs from combat, morale, officer quality, and operation logic remain untouched.

## Root Cause Evidence

Baseline post-force-quality run:

`F:\A-War-Without-Victory\runs\apr1992_definitive_188w__210e69404d054959__w188_n1599`

Equipment diagnostic before this fix:

| Run | RS active | tanks | tank_op | tank_op% | artillery | art_op | art_op% | equipment_decay |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 40w n1597 | 83 | 609 | 332 | 0.545 | 1364 | 1273 | 0.933 | 0.925 mean |
| 188w n1599 | 49 | 172 | 1 | 0.007 | 423 | 14 | 0.033 | 0.602 mean |

This proves the contradiction: the canonical scalar floor says the VRS should still retain about 60% equipment effectiveness, while the live condition system drives heavy weapons toward zero.

Owner files:

- `src/sim/combat/equipment_effects.ts` - `degradeEquipment` and `applyConditionDegradation` shifted operational condition with no floor.
- `src/sim/turn_phases/war_phases.ts` - `equipment-degradation` called `degradeEquipment` before `apply-vrs-equipment-decay`, with no timeline-floor handoff.
- `src/sim/combat/combat_math.ts` and `src/sim/combat/corps_operation_readiness.ts` consume live condition fractions, so the condition collapse was gameplay-significant, not cosmetic.

## Implementation

Changed `degradeEquipment` to accept an optional `operationalFloor` parameter. The default is `0`, preserving existing behavior for all callers that do not pass a floor.

Changed `applyConditionDegradation` so routine degradation can shift only the operational fraction above that floor:

```ts
const degradableOperational = Math.max(0, cond.operational - operationalFloor);
const shift = Math.min(degradableOperational, Math.max(0, rate));
```

Added `getRoutineEquipmentOperationalFloor(state, formation, turn)` in `war_phases.ts`.

- Applies only to RS formations.
- Applies only after the configured VRS equipment-decay start week.
- Reads `state.military.war_timeline.equipment_decay[].floor` when present.
- Falls back to `VRS_EQUIPMENT_DECAY_FLOOR`.

The fix deliberately does not prevent combat from destroying raw equipment. It only stops routine weekly maintenance decay from bypassing the canon floor.

## New Diagnostic

Added:

`tools/diagnostics/equipment_decay_audit.cjs`

Usage:

```bash
node tools/diagnostics/equipment_decay_audit.cjs <run_dir> [<run_dir> ...]
```

It emits:

- Active/inactive brigade counts by faction.
- Raw tanks/artillery.
- Condition-weighted operational tanks/artillery.
- Operational fractions.
- `equipment_decay` min/mean/max.
- Lowest RS heavy-support brigades.

The script is read-only and deterministic: object keys are sorted with a bytewise comparator; no timestamps or randomness.

## Validation

### Unit and Type Checks

| Check | Result |
|---|---|
| Red test: `tests/brigade_composition.test.ts` floor regression before code | Failed as expected: tank operational fell to 0 instead of >= 0.60 |
| `vitest tests/brigade_composition.test.ts` after fix | 23/23 pass |
| `vitest tests/brigade_composition.test.ts tests/corps_operation_readiness.test.ts tests/attack_equipment_effects.test.ts` | 87/87 pass |
| `npx.cmd tsc --noEmit` | Clean |

Note: the isolated worktree needed junctions to the main workspace `node_modules` and `src/ui/map/node_modules` to reproduce the main workspace typecheck environment. No dependency files were staged.

### 40w Scenario

Run:

`runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`

Determinism rerun:

`runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n2`

Both hashes:

`7fc9c97801e5aecf`

40w painted target (`jan1993`):

| Metric | Result |
|---|---:|
| Match | 650/712 (91.3%) |
| Area-weighted | 93.3% |
| Diagnose | 0 errors / 30 warnings |
| Validate | PASS |

40w equipment change vs n1597:

| Metric | Baseline n1597 | Post-fix n0/n2 |
|---|---:|---:|
| RS tanks | 609 | 688 |
| RS tank_op | 332 | 427 |
| RS tank_op% | 0.545 | 0.621 |
| RS artillery | 1364 | 1364 |
| RS art_op | 1273 | 1273 |
| RS art_op% | 0.933 | 0.933 |

The 40w hash change is expected because the fix is active from week 26. Territorial health remains in the same band.

### 188w Scenario

Run:

`runs/apr1992_definitive_188w__210e69404d054959__w188_n1`

Hash:

`55d655efa6322a54`

188w painted target (`oct1995`):

| Metric | Baseline n1599 | Post-fix n1 |
|---|---:|---:|
| Count match | 69.7% | 70.8% |
| Area-weighted match | 62.0% | 63.2% |
| RS count delta vs painted | -4 | -7 |
| RBiH count delta vs painted | +37 | +39 |
| HRHB count delta vs painted | -33 | -32 |

188w diagnostics:

| Check | Baseline n1599 | Post-fix n1 |
|---|---:|---:|
| `diagnose_run` | 1 error (Gorazde 0/2) + 35 warnings | 0 errors + 35 warnings |
| `validate_run_consistency` | 59 failures | 18 failures |
| Gorazde siege detector | ERROR | OK (2 brigades near target) |

188w equipment change:

| Metric | Baseline n1599 | Post-fix n1 |
|---|---:|---:|
| RS active brigades | 49 | 57 |
| RS tanks | 172 | 534 |
| RS tank_op | 1 | 324 |
| RS tank_op% | 0.007 | 0.607 |
| RS artillery | 423 | 983 |
| RS art_op | 14 | 598 |
| RS art_op% | 0.033 | 0.609 |
| RS equipment_decay mean | 0.602 | 0.606 |

The fix restores the intended equipment floor without turning the late-war map into a railroad. October 1995 painted fit improves only modestly, and the same missing opportunity/operation-delivery families remain.

## Determinism Review

No determinism risks found against `docs/DETERMINISM_TEST_MATRIX.md`, `docs/10_canon/Engine_Invariants_v0_6_0.md`, `docs/PHASE_A_INVARIANTS.md`, and `docs/CODE_CANON.md`.

- No `Math.random`, `Date.now`, or locale-sensitive ordering introduced.
- The diagnostic sorts object keys with a bytewise comparator.
- The behavior path reads already-persisted deterministic state: faction, turn, and timeline config.
- Scenario rerun confirmed deterministic 40w hash under the new code: `7fc9c97801e5aecf` twice.

## Remaining Follow-Ups

This packet does not solve:

1. Late-war opportunity execution and capture delivery.
2. Federation internal balance / HRHB under-expansion.
3. RBiH cap discipline and force-quality saturation.
4. Whether RBiH tank condition should also have a support-floor/capture-normalization pass. RBiH tanks remain nearly non-operational at 188w, while artillery is healthy; that is a separate owner because it is not the VRS decay-floor bug.

This packet does close the historian P0 that VRS heavy equipment had become nearly nonexistent by Dayton.
