# Brigade Dissolution Threshold Audit

Date: 2026-05-17
Plan: `docs/plans/2026-05-17-brigade-dissolution-threshold-plan.md`

## Current Mechanism

`dissolveCombatIneffectiveBrigades` iterates active brigade/OG formations in sorted formation-id order and emits a deterministic report (`src/sim/combat/brigade_dissolution.ts:111`). The constants are:

| Constant | Value | Citation |
|---|---:|---|
| `DISSOLUTION_PERSONNEL_THRESHOLD` | 400 | `src/sim/combat/brigade_dissolution.ts:48` |
| `DISSOLUTION_COHESION_THRESHOLD` | 20 | `src/sim/combat/brigade_dissolution.ts:49` |
| `DISSOLUTION_MORALE_THRESHOLD` | 15 | `src/sim/combat/brigade_dissolution.ts:50` |
| `DISSOLUTION_ABSOLUTE_FLOOR` | 150 | `src/sim/combat/brigade_dissolution.ts:53` |
| `ENCLAVE_DISSOLUTION_ABSOLUTE_FLOOR` | 50 | `src/sim/combat/brigade_dissolution.ts:56` |
| `DISSOLUTION_PERSONNEL_CAP` | 800 | `src/sim/combat/brigade_dissolution.ts:60` |
| `DISSOLUTION_PERSONNEL_TO_RESERVE_RATE` | 0.5 | `src/sim/combat/brigade_dissolution.ts:61` |
| `DISSOLUTION_EQUIPMENT_TRANSFER_RATE` | 0.7 | `src/sim/combat/brigade_dissolution.ts:62` |
| `MORALE_OVERRIDE_TURNS` | 8 | `src/sim/combat/brigade_dissolution.ts:73` |

## Paths Present Today

1. Non-enclave brigades dissolve when at least two of three criteria fire: low personnel, low cohesion, low morale. The threshold values can be resolved from the war timeline, then `criteriaCount` is computed and compared to `requiredCriteria` (`src/sim/combat/brigade_dissolution.ts:168`, `src/sim/combat/brigade_dissolution.ts:171`, `src/sim/combat/brigade_dissolution.ts:174`, `src/sim/combat/brigade_dissolution.ts:179`, `src/sim/combat/brigade_dissolution.ts:182`).
2. Enclave-tagged brigades use the lower absolute floor 50 and require all three criteria, because `requiredCriteria` is 3 when `isEnclaveBrigade(f)` is true (`src/sim/combat/brigade_dissolution.ts:134`).
3. Absolute floor is part of the low-personnel criterion, not an independent instant-kill path: `lowPersonnel = personnel < personnelThreshold || personnel < absFloor` (`src/sim/combat/brigade_dissolution.ts:168`, `src/sim/combat/brigade_dissolution.ts:179`).
4. Large brigades exit early when personnel is at or above 800 unless the morale-collapse override is active (`src/sim/combat/brigade_dissolution.ts:154`).
5. Morale-collapse override is gated by `MORALE_OVERRIDE_ENABLED === 'true'` and `morale_low_streak >= 8`; when active it bypasses the personnel cap and criteria-count gate (`src/sim/combat/brigade_dissolution.ts:145`, `src/sim/combat/brigade_dissolution.ts:148`, `src/sim/combat/brigade_dissolution.ts:154`, `src/sim/combat/brigade_dissolution.ts:182`).

## Lifecycle Effects

On dissolution the module:

- Adds `floor(personnel * 0.5)` to the faction strategic reserve when that reserve exists (`src/sim/combat/brigade_dissolution.ts:185`, `src/sim/combat/brigade_dissolution.ts:191`).
- Salvages `floor(tanks * 0.7)` and `floor(artillery * 0.7)` to the first sorted same-faction, same-corps active brigade, then zeros tanks/artillery/AA on the dissolved brigade (`src/sim/combat/brigade_dissolution.ts:197`, `src/sim/combat/brigade_dissolution.ts:198`, `src/sim/combat/brigade_dissolution.ts:213`).
- Removes the formation from active operation participants and axes before setting inactive status (`src/sim/combat/brigade_dissolution.ts:32`, `src/sim/combat/brigade_dissolution.ts:237`).
- Sets `status='inactive'`, `lifecycle_status='destroyed'`, `personnel=0`, and `destruction_turn=state.meta.turn ?? 0` (`src/sim/combat/brigade_dissolution.ts:241`, `src/sim/combat/brigade_dissolution.ts:244`).

## Pipeline Wiring

War phases call the same dissolution module twice:

- Pre-combat pass imports and runs `dissolveCombatIneffectiveBrigades`, then writes `context.report.brigade_dissolution` when any brigade dissolves (`src/sim/turn_phases/war_phases.ts:416`, `src/sim/turn_phases/war_phases.ts:417`, `src/sim/turn_phases/war_phases.ts:419`).
- Post-combat pass runs the same function and merges with the existing report when the pre-combat pass already produced rows (`src/sim/turn_phases/war_phases.ts:1868`, `src/sim/turn_phases/war_phases.ts:1869`, `src/sim/turn_phases/war_phases.ts:1875`, `src/sim/turn_phases/war_phases.ts:1876`, `src/sim/turn_phases/war_phases.ts:1879`).

## Timeline Substrate

The war timeline owns optional per-faction absolute threshold step-curves for personnel, cohesion, and morale (`src/state/war_timeline.ts:109`, `src/state/war_timeline.ts:110`, `src/state/war_timeline.ts:111`, `src/state/war_timeline.ts:119`, `src/state/war_timeline.ts:120`, `src/state/war_timeline.ts:121`). `lookupStepCurve` is a deterministic sequential scan (`src/state/war_timeline.ts:149`).

Current `apr1992` dissolution entries are VRS-only:

- Cohesion threshold: RS 20 from turn 0 through 38, then 15 from turn 39 onward (`data/scenarios/timelines/apr1992.json:411`, `data/scenarios/timelines/apr1992.json:413`, `data/scenarios/timelines/apr1992.json:414`).
- Morale threshold: RS 15 from turn 0 through 38, 12 from turn 39 through 103, then 9 from turn 104 onward (`data/scenarios/timelines/apr1992.json:417`, `data/scenarios/timelines/apr1992.json:419`, `data/scenarios/timelines/apr1992.json:420`, `data/scenarios/timelines/apr1992.json:421`).

## Determinism

No nondeterminism risks found for the audited mechanism: formation ids are sorted before iteration, no time/random APIs are used, and timeline threshold lookup is deterministic. The lane added tests only; no threshold data or simulation code changed.
