# HRHB-RBiH War Transition System — Implementation Report

**Date:** 2026-03-19
**Branch:** `feature/hrhb-rbih-war-transition` (9 commits, worktree `.worktrees/hrhb-rbih-war`)
**Calibration:** 40w = 91.4% area-weighted (+0.2pp from n957 baseline). 56w transition verified.
**Tests:** 1242 passing across 102 suites.

---

## Summary

Implemented an emergent, condition-driven Croat-Bosniak war transition system. The alliance between RBiH and HRHB degrades organically through patron pressure, refugee influx, and bilateral incidents. When it crosses the allied threshold, a 4-turn mobilization buildup begins: front edges appear, sectors form, brigades redeploy — but combat is suppressed. After mobilization, open warfare begins. Events fire on state conditions (alliance thresholds, territorial control), not hardcoded turn numbers. Player decisions in key events (Gornji Vakuf clashes, Vance-Owen Plan) accelerate or delay the breakdown.

Fixed three critical infrastructure bugs that had prevented HVO Central Bosnia from functioning: stale officer corps IDs, missing corps formation in war phase, and sector consolidation absorbing enclave corps.

---

## Commits

| SHA | Description |
|-----|-------------|
| `7607494` | fix(data): map stale `hvo_oz_*` officer corps IDs to current `hvo_*` IDs |
| `eb238d6` | feat(sim): mobilizing alliance phase — 4-turn buildup before HRHB-RBiH combat |
| `fcb0a1f` | feat(sim): suppress HRHB-RBiH combat during 4-turn mobilization buildup |
| `3c146fd` | feat(events): condition-driven HRHB-RBiH war events — emergent triggers, player decisions |
| `f2478c2` | test: verify hvo_central_bosnia gets sectors when HRHB-RBiH fronts appear |
| `2d5c058` | feat(bot): defensive posture for HRHB/RBiH corps during mobilization buildup |
| `4125b84` | feat(scenario): add 56-week scenario for HRHB-RBiH war transition testing |
| `4586ec9` | fix(sim): corps subordinate count update + readiness reversion bug |
| `84b8b2d` | fix(sim): hvo_central_bosnia — corps activation in war phase + sector consolidation protection |

---

## What Was Built

### 1. Mobilization Phase (alliance_update.ts)

New alliance phase between "allied" and "at war": when the RBiH-HRHB alliance value drops to ≤0.20 (ALLIED_THRESHOLD), a mobilization period begins. State field `mobilization_started_turn` on `RbihHrhbState` tracks when this started.

**New queries:**
- `isRbihHrhbMobilizing(state)` — true during the 4-turn buildup window
- `isRbihHrhbCombatEnabled(state)` — true when mobilization expired OR alliance ≤ 0.00

**Constant:** `MOBILIZATION_DURATION_TURNS = 4` (1 month at weekly resolution).

**13 tests** in `tests/alliance_mobilization.test.ts`.

### 2. Combat Suppression During Mobilization

Four files gated on `isRbihHrhbCombatEnabled()`:
- `bot_brigade_eval_attack.ts` — filters HRHB↔RBiH targets during mobilization
- `bot_corps_directives.ts` — suppresses offensive target generation
- `attack_resolution_osid.ts` — safety gate in resolver
- `battle_resolution.ts` — legacy resolver gate

**12 tests** in `tests/mobilization_combat_suppression.test.ts`.

### 3. Condition-Driven Events (war_1993.json)

6 events converted from hardcoded turn triggers to condition-based:

| Event | Old | New |
|-------|-----|-----|
| Gornji Vakuf clashes | Turn 40 | w35-60, `alliance_below 0.45` + player decision (escalate/negotiate) |
| Croat-Bosniak War Begins | Turn 54 | w40-80, `alliance_below 0.10` |
| Ahmici Massacre | Turn 54 | w40-70, requires war + HRHB controls Vitez |
| East Mostar Siege | Turn 57 | w45-80, requires war |
| Central Bosnia Fighting | Turn 58 | w46-80, requires war |
| Operation Neretva '93 | Turn 75 | w60-95, requires war |

Player decisions added to Gornji Vakuf (escalate: alliance -0.20, negotiate: -0.05).

### 4. Bot Mobilization Stance (bot_corps_stance.ts)

When `isRbihHrhbMobilizing()`, any HRHB or RBiH corps facing the other faction's front edges adopts `defensive` stance. Uses `opposing_factions` on sector data. Does not override `reorganize` (depleted corps). RS corps unaffected.

**7 tests** in `tests/mobilization_bot_stance.test.ts`.

### 5. HVO Infrastructure Fixes

**5a. Stale officer corps IDs** — 24 `hvo_oz_*` references in `apr1992_officers.json` mapped to current `hvo_*` IDs. Also fixed `CORPS_ENCLAVE_MAP` in `officer_system.ts`.

**5b. Corps subordinate count** — `initializeCorpsCommand()` now updates `subordinate_count` for already-initialized corps. Previously skipped with `continue`, leaving all HVO corps at `subordinate_count: 0`.

**5c. Readiness reversion bug** — `deriveReadinessState()` no longer reverts active brigades to `'forming'` when cohesion drops below `ACTIVE_MIN_COHESION` (40). Once past forming, low cohesion → `overextended`/`degraded`, not `forming`. This fixed ALL 29 HRHB brigades oscillating between active/forming every turn.

**5d. Corps activation in war phase** — New `activate-corps` pipeline step in `war_phases.ts` creates corps formations from OOB data. `hvo_central_bosnia` (`available_from: 10`) was never created because the peace-phase step doesn't run when scenarios start in war phase. Pipeline: 139 steps.

**5e. Sector consolidation protection** — `consolidateCrossCorpsFronts` now protects a minority corps if ANY of its edges in the component have a brigade stationed there. Previously, isolated enclave corps were drained edge-by-edge across multiple components.

---

## 56-Week Transition Timeline (Verified)

| Week | Milestone |
|------|-----------|
| w0 | Alliance = 0.75 (strong) |
| w10 | `hvo_central_bosnia` corps formation created |
| w29 | HVO-ARBiH tensions rise (event) |
| w31 | **Mobilization starts** — front edges appear, sectors form |
| w35 | **Gornji Vakuf clashes** fire (condition: alliance < 0.45) |
| w39 | Vance-Owen Plan (player decision) |
| w40 | **Croat-Bosniak war declared** (condition: alliance < 0.10) |
| w43 | **First HRHB-RBiH battle** — ARBiH attacks Kiseljak |
| w45 | East Mostar siege fires |
| w46 | Central Bosnia three-way war fires |

---

## Remaining Work (Backlog)

### P1 — Blocking for full Croat-Bosniak war gameplay

1. **CB brigade redistribution** — `hvo_central_bosnia` has 5 brigades across 6 sectors (5/6 empty). The Kiseljak pocket has 3 brigades stacked at 2 OSIDs while Busovaca, Vitez, Novi Travnik, and Zepce sectors are undefended. Needs sector assignment to distribute brigades to front positions.

2. **CB operations not launching** — Only 3 HRHB-RBiH battles in 16 war weeks. The corps needs to generate operations against ARBiH targets. Currently `hvo_central_bosnia` stance is `balanced` but `subordinate_count=5` may be below the operation launch threshold.

3. **Kiseljak/Vitez pocket separation** — Historically, the Kiseljak enclave and the Vitez/Busovaca/Travnik enclave became physically separated. The sim needs to model this as two distinct pockets when ARBiH severs the connection (Fojnica/Kresevo corridor).

### P2 — Important for realism

4. **ARBiH response to HVO war** — ARBiH 3rd Corps and 4th Corps need offensive doctrine against HRHB once the war starts. Currently they adopt `defensive` during mobilization but don't transition to offensive afterward.

5. **East Mostar siege mechanics** — The event fires but has no mechanical implementation (siege state, supply cut, civilian suffering). Needs enclave-style treatment for East Mostar Bosniaks.

6. **Ahmici condition verification** — The event requires HRHB to control Vitez at >50% — but `faction_controls_municipality` uses OSID-keyed controllers with municipality slug matching. Verify this fires in 56w+ runs where HVO is active in Vitez.

### P3 — Polish

7. **Abdic APWB (w77)** — The Bihac internal split event exists but has no mechanical effect beyond morale. Should spawn Abdic formations and split the 5th Corps.

8. **Washington Agreement repair (w102)** — Alliance locks at +0.80, but the mechanical transition back to cooperation (joint operations, shared supply) isn't implemented.

9. **52w scenario coverage** — The 52w scenario misses the war by 2 weeks (ends at w52, war at ~w40-54). Either adjust the scenario duration or ensure the condition-triggered events fire within 52 weeks by tuning alliance decay rate.

---

## Bugs Found and Fixed (Root Causes)

| Bug | Root Cause | Impact | Fix |
|-----|-----------|--------|-----|
| HVO officers orphaned | `hvo_oz_*` stale corps IDs in officer data | Blaskic commands nothing | Map to current `hvo_*` IDs |
| Corps subordinate count stuck at 0 | `initializeCorpsCommand` skip on re-init | All HVO corps show 0 subordinates | Update count on re-init instead of skip |
| All HRHB brigades readiness=forming | `deriveReadinessState` reverts active→forming at cohesion<40 | 29 brigades non-functional for 55 weeks | Remove cohesion gate for non-forming brigades |
| `hvo_central_bosnia` never created | Peace-phase activate-corps doesn't run in war-start scenarios | Corps has 0 sectors, 0 edges | Add war-phase activate-corps step |
| CB pockets absorbed into Tomislavgrad | `consolidateCrossCorpsFronts` drains minority corps edge-by-edge | CB gets 0 sectors despite 5 brigades at front | Brigade-presence protection at component level |

---

## Files Modified

| File | Change |
|------|--------|
| `src/sim/early_war/alliance_update.ts` | Mobilization phase, new queries, constants |
| `src/state/game_state.ts` | `mobilization_started_turn` on `RbihHrhbState` |
| `src/sim/combat/bot_brigade_eval_attack.ts` | Combat suppression gate |
| `src/sim/combat/bot_corps_directives.ts` | Combat suppression gate |
| `src/sim/combat/attack_resolution_osid.ts` | Safety combat gate |
| `src/sim/combat/battle_resolution.ts` | Legacy resolver gate |
| `src/sim/combat/bot_corps_stance.ts` | Mobilization defensive stance |
| `src/sim/combat/corps_command.ts` | Subordinate count update on re-init |
| `src/sim/combat/officer_system.ts` | `CORPS_ENCLAVE_MAP` stale ID |
| `src/sim/combat/sector_territory.ts` | Brigade-presence consolidation protection |
| `src/sim/combat/corps_front_sectors.ts` | Debug log cleanup |
| `src/sim/turn_phases/war_phases.ts` | War-phase activate-corps step (139 steps) |
| `src/state/formation_lifecycle.ts` | Remove cohesion→forming reversion |
| `data/scenarios/events/war_1993.json` | Condition-driven triggers, player decisions |
| `data/scenarios/officers/apr1992_officers.json` | `hvo_oz_*` → `hvo_*` |
| `data/scenarios/apr1992_definitive_56w.json` | New 56-week test scenario |
| `package.json` | `sim:scenario:run:56w` script |
| `tests/alliance_mobilization.test.ts` | 13 mobilization tests |
| `tests/mobilization_combat_suppression.test.ts` | 12 combat suppression tests |
| `tests/mobilization_bot_stance.test.ts` | 7 bot stance tests |
| `tests/hvo_central_bosnia_sectors.test.ts` | 6 sector creation tests |
| `tests/war_phase_step_order.test.ts` | Step count 138→139 |
| `tests/event_timeline_integrity.test.ts` | Event count update |
| `vitest.config.ts` | New test files registered |
