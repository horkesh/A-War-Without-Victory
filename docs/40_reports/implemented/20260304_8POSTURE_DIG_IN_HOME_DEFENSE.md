# 8-Posture System: dig_in + Home Ground Defense

**Date:** 2026-03-04
**Branch:** feature/posture-system
**Commits:** 9 (5bc234f → fb74032)
**Tests:** 310 passing, 2 pre-existing failures (war_timeline), 1 skipped

## Summary

- Replaced the legacy 5-posture system (`defend | probe | attack | elastic_defense | consolidation`) with an 8-posture system: `hold | defend | defend_at_all_costs | elastic_defense | counterattack | dig_in | attack | assault`
- Added `dig_in` posture: multi-turn active fortification with ramping defense multiplier, 3× entrenchment rate, and operational lockout constraints
- Added `home_defense_active` per-brigade flag auto-computed each turn: blocks offensive postures for militia in their home municipality; auto-upgrades `hold` → `defend` and enforces a morale floor of 15
- Added `counterattack_window_turns` countdown enabling counterattack posture after retreat
- `probe` and `consolidation` removed from `BrigadePosture`; save-file migration maps them to `hold`

## Design Decisions

**Why dig_in?** Distinguishes *active deliberate fortification* (player commitment, operational lockout) from passive entrenchment (accumulates automatically at 0.035/turn). dig_in triples the entrenchment rate, raises the cap from 6 to 9, and ramps defense from 1.35 → 1.60 over 3 turns — meaningful enough to warrant sacrifice of offensive flexibility.

**Why replace probe and not elastic_defense?** `probe` was dead code — never assigned by the bot in the old system and had no distinct mechanic. `elastic_defense` retained because the planned-retreat → counterattack chain (Bihać pattern) uses it.

**Home ground design:** Militia brigades in their home municipality cannot be ordered into offensive operations (attack/assault blocked). They auto-upgrade passive `hold` orders to `defend`, and maintain a morale floor of 15 even under sustained bombardment. Home ground gives +0.5 cohesion/turn bonus (reduced drain).

## Changes Made

### game_state.ts
- `BrigadePosture` type: 5 → 8 postures (added hold, defend_at_all_costs, counterattack, dig_in, assault; removed probe, consolidation)
- `FormationState`: added `home_defense_active?: boolean`, `counterattack_window_turns?: number`, `dig_in_progress?: number`
- `BotBrigadeAction.posture`: changed from `'probe' | 'attack' | 'defend'` to `BrigadePosture`

### combat_math.ts
- `POSTURE_ATTACK` and `POSTURE_DEFENSE` tables: updated for all 8 postures (dig_in base defense = 1.35 in static table, but computed dynamically via `computeDigInDefMult`)
- New exported constants: `HOME_GROUND_DEFENSE_MULT=1.25`, `HOME_GROUND_COUNTERATTACK_MULT=1.15`, `HOME_GROUND_OQ_BONUS=0.10`, `HOME_GROUND_MORALE_FLOOR=15`, `HOME_GROUND_COHESION_BONUS=0.5`, `DIG_IN_BASE_DEF=1.35`, `DIG_IN_FULL_DEF=1.60`, `DIG_IN_FULL_EFFECT_THRESHOLD=0.75`
- New exported function `computeDigInDefMult(progress)`: ramps from 1.35 → 1.60 as progress goes from 0 → 0.75 (full effect threshold)
- `computeDefenderPower()`: uses `computeDigInDefMult(formation.dig_in_progress)` when posture === 'dig_in' instead of static table value

### brigade_posture.ts (fully rewritten)
- `POSTURE_MIN_COHESION`: hold/defend/elastic_defense/dig_in=0, defend_at_all_costs/counterattack=10, attack=25, assault=60
- `POSTURE_COHESION_COST`: hold=+1.0, defend=-1.0, defend_at_all_costs=-4.0, elastic_defense=-0.5, counterattack=-1.5, dig_in=+0.5, attack=-3.0, assault=-5.0
- `DEFEND_COHESION_CAP = 85` (caps recovery for hold and dig_in only — defend drains)
- `canAdoptPosture()`: blocks attack/assault when `home_defense_active === true`
- `applyPostureOrders()`: save migration (probe/consolidation → hold), home-ground auto-upgrade (hold → defend), defend_at_all_costs exempt from auto-downgrade
- `applyPostureCosts()`: home ground +0.5 bonus, dig_in progress increment/reset, auto-downgrade to hold when cohesion < minimum (except defend_at_all_costs)
- `normalizePosture()` exported for save-file migration; `VALID_POSTURES: ReadonlySet` at module level

### compute_home_defense.ts (NEW)
- `computeHomeDefenseActive(state)`: iterates active brigades, sets `home_defense_active = location_osid.startsWith('op:${origin_mun}:')`, decrements `counterattack_window_turns`
- Key discovery: home municipality field is `brigade.origin_mun` (OSID prefix pattern)

### war_phases.ts
- New pipeline step `'compute-home-defense-active'` inserted after `phase-ii-enclave-resilience`, before `osid-column-movement`
- Runs only when `context.state.meta.phase === 'war'`

### morale_drift.ts
- After per-turn drift: `if (f.home_defense_active === true) { f.morale = Math.max(f.morale, HOME_GROUND_MORALE_FLOOR); }`
- Prevents militia morale collapse under sustained siege/bombardment

### brigade_pressure.ts
- `POSTURE_PRESSURE_MULT` and `POSTURE_DEFENSE_MULT` tables updated for all 8 postures
- dig_in pressure = 0.10 (locked in, minimal offensive output)

### equipment_effects.ts
- Offensive flag: `posture === 'attack' || posture === 'assault' || posture === 'counterattack'` (removed isConsolidation)
- Equipment tempo table: assault=1.60, attack=1.50, counterattack=1.30, dig_in=0.80, default=1.0

### bot_brigade_ai_osid.ts
- Home-ground early exit: if `home_defense_active`, assign counterattack (when `counterattack_window_turns > 0`) or defend; skip all other rules
- Assault gated: offensive corps + cohesion ≥ 60 → assault, else attack
- dig_in for defensive/balanced corps when no attack target and cohesion ≥ 20
- Default posture changed from 'defend' → 'hold'

### consolidation_flips.ts
- Permanently disabled: returns `{ flips_applied: 0, by_formation: {} }` unconditionally
- Comment explains 8-posture migration rationale

### formationIcons.ts
- `POSTURE_STRIPE` updated: new earth-brown color for dig_in, new colors for hold/defend_at_all_costs/counterattack/assault

### 12 other files cleaned
- Removed stale `probe`/`consolidation` posture references from: `battle_resolution.ts`, `combat_estimate.ts`, `combat_predictor.ts`, `initial_formations_loader.ts`, `sandbox_slice_determinism.test.ts`, `brigade_composition.test.ts`, `brigade_pressure.test.ts`, `local_truces.test.ts`, `bot_strategy.ts` (preferred_posture_when_overstaffed → 'hold')

## Refactor Pass (d8eb79d)
- Removed dead `DIG_IN_FULL_EFFECT_THRESHOLD` constant duplicate in brigade_posture.ts
- Removed `defend` from recovery cap branch (defend costs -1.0/turn, drains even with home bonus)
- Wired `normalizePosture()` into `applyPostureCosts()` to prevent NaN on legacy saves
- Removed dead `corpsStance === 'defensive'` branch in bot Rule 6 (unreachable, handled in Rule 4)

## Code-Simplifier Pass (fb74032)
- Removed unnecessary cast in `computeDefenderPower` (`formation.dig_in_progress` is on FormationState)
- `VALID_POSTURES` promoted to module-level `ReadonlySet` (was inside function body)
- Renamed local `window` variable → `remaining` (avoids global shadow)
- Fixed stale comment (removed `defend` from recovery-cap list)

## Tests

**22 new tests in `tests/brigade_posture.test.ts`:**
- dig_in defense ramp at 5 progress values (0, 0.25, 0.5, 0.75, 1.0)
- dig_in progress increment per turn and reset on posture change
- dig_in cohesion +0.5/turn with DEFEND_COHESION_CAP
- normalizePosture: probe → hold, consolidation → hold, valid postures pass through
- assault cohesion gate (blocked at coh=40, allowed at coh=60)
- home_defense_active blocks attack and assault, allows defend
- hold → defend auto-upgrade when home_defense_active
- defend_at_all_costs: never auto-downgrades even at cohesion=0

**Final test count:** 310 passing, 2 pre-existing failures (war_timeline.test.ts), 1 skipped

## Spec Document
`docs/30_planning/20260304_POSTURE_HOME_GROUND_DEFENSE_SPEC.md` — updated throughout with dig_in spec, revised posture table, §2.6 (removal of probe/consolidation), §2.7 (dig_in construction mechanics), §16 implementation delta.

## Files Changed

| File | Change |
|------|--------|
| `src/state/game_state.ts` | BrigadePosture 8-posture, 3 new FormationState fields |
| `src/sim/combat/combat_math.ts` | Tables + constants + computeDigInDefMult + computeDefenderPower |
| `src/sim/combat/brigade_posture.ts` | Full rewrite for 8-posture system |
| `src/sim/compute_home_defense.ts` | NEW — computeHomeDefenseActive pipeline function |
| `src/sim/turn_phases/war_phases.ts` | New pipeline step compute-home-defense-active |
| `src/sim/combat/morale_drift.ts` | Home ground morale floor |
| `src/sim/combat/brigade_pressure.ts` | Updated posture tables |
| `src/sim/combat/equipment_effects.ts` | Updated offensive flag + tempo table |
| `src/sim/combat/bot_brigade_ai_osid.ts` | 5-state decision tree with home-ground gate |
| `src/sim/combat/consolidation_flips.ts` | Permanently disabled stub |
| `src/ui/map/map/formationIcons.ts` | Updated POSTURE_STRIPE colors |
| `src/sim/combat/bot_strategy.ts` | preferred_posture_when_overstaffed → 'hold' |
| `tests/brigade_posture.test.ts` | 22 new tests |
| 11 other files | Probe/consolidation cleanup |

## Determinism
- No randomness introduced in any new file
- `computeHomeDefenseActive()`: sorted iteration, deterministic OSID prefix check
- `applyPostureCosts()`: sorted iteration, deterministic ramp formula
- No `Date.now()`, no `Math.random()`, no object key ordering assumptions
- `normalizePosture()` on load prevents undefined posture causing NaN cohesion

## Next Steps
- Run 40w scenario (n414) to measure impact of dig_in and home defense on calibration targets
- Merge feature/posture-system to main
- Propagate new posture names to Systems Manual, War Specification, AI Strategy Spec, Tactical Map System
