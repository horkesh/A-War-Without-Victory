# Paramilitary Rear Pocket Cleanup — Implementation Report

**Date:** 2026-03-07
**Status:** Implemented and verified (365 tests pass, typecheck clean, 40w scenario stable)
**Commit context:** feat: paramilitary rear pocket cleanup system

---

## 1. Summary

Small autonomous paramilitary formations spawn when rear enemy pockets are detected, march to them over 2 turns, capture undefended territory, and dissolve. Casualties inflicted and suffered count toward faction totals. Civilian casualties are recorded as war crimes against the civilian population of the captured OSID.

Active mainly weeks 0-20, fading out as the war professionalizes. Faction-differentiated spawn rates reflect historical organizational penetration: RS (Arkan's Tigers, White Eagles) >> HRHB (HOS, Croatian volunteers) >> RBiH (Patriotska Liga, Green Berets).

Player choice: bot factions auto-approve; player faction gets a batch decision panel (pending requests with allow/deny/regular). Standing policy (`always_allow`, `always_deny`, `ask`) avoids per-turn micro-management.

**Historical grounding:** Balkan Battlegrounds documents the pattern of "takeover, consolidation, cleanup" — rear areas secured by irregular forces while main formations advance. RS had extensive paramilitary networks through SDS/JNA channels. HRHB had HOS and Croatian volunteer units. RBiH's Patriotska Liga and Green Berets were largely integrated into regular forces early in the war, reducing paramilitary activity.

---

## 2. Design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Formation kind vs tag/class | New `'paramilitary'` FormationKind | Clean exclusion from reinforcement, bot AI, and formation spawn; lifecycle fully separate from brigades |
| Spawn mechanism | Graph analysis detects enemy pockets (OSIDs where ALL neighbors are faction-controlled) | Deterministic, no randomness; uses existing OSID adjacency graph |
| Spawn probability | Deterministic hash (char code sum) against faction-specific rate | Stable across reruns; faction-differentiated |
| March time | 2 turns (PARAMILITARY_MARCH_TURNS) | Represents march + mop-up; gives player/opponent time to react |
| Casualty model | Standard KIA/WIA/MIA split (0.30/0.55/0.15) matching combat system | Consistent with attack_resolution_osid.ts and frontline_attrition.ts |
| Civilian casualties | 2% of avg OSID population (5000) = 100 per capture | War crimes model; recorded against the losing faction's civilian ledger |
| Defended pocket handling | 3x casualty rate, then dissolve (no capture) | Paramilitary forces cannot take defended positions |
| Player choice | `paramilitary_policy` standing order + per-request decisions | Player agency without micro-management burden |
| Fade mechanic | Hard cutoff at week 20 (PARAMILITARY_FADE_WEEK) | War professionalizes; checked in both pipeline and function (defense in depth) |
| Consequence tracking | `paramilitary_deployment_count` per faction | Enables future legitimacy/IVP/patron consequences scaling |

---

## 3. Constants

All constants in `src/state/formation_constants.ts`:

| Constant | Value | Purpose |
|----------|-------|---------|
| PARAMILITARY_UNIT_SIZE | 150 | Personnel per paramilitary unit |
| PARAMILITARY_MARCH_TURNS | 2 | Turns to reach target |
| PARAMILITARY_FADE_WEEK | 20 | Week after which no new paramilitaries spawn |
| PARAMILITARY_SPAWN_RATE (RS) | 0.85 | High — SDS/JNA paramilitary networks |
| PARAMILITARY_SPAWN_RATE (HRHB) | 0.55 | Moderate — HOS, Croatian volunteers |
| PARAMILITARY_SPAWN_RATE (RBiH) | 0.30 | Low — Patriotska Liga, Green Berets |
| PARAMILITARY_CASUALTY_RATE | 0.08 | Fraction of unit lost per sweep |
| PARAMILITARY_CIVILIAN_CASUALTY_RATE | 0.02 | Civilian losses as fraction of OSID population |
| PARAMILITARY_COHESION | 20 | Very low — irregular forces |
| PARAMILITARY_INITIAL_MORALE | 80 | Moderate starting morale |
| PARAMILITARY_TARGET_AVG_POPULATION | 5000 | Average civilian pop at target OSID |

---

## 4. Architecture

### 4.1 Core module

**`src/sim/combat/paramilitary_sweep.ts`** (~350 lines)

Three exported functions:

1. **`detectParamilitaryTargets(state, edges, reverseMap)`** — Detect rear enemy pockets for all factions. Uses `analyzeFactionGraph()` from `osid_graph_analysis.ts` to find enemy OSIDs completely surrounded by faction territory. Bot factions auto-spawn; player faction populates `pending_paramilitary_requests`.

2. **`advanceParamilitaries(state, reverseMap)`** — Advance all active paramilitary formations. Decrement ETA. At ETA=0: capture target (flip `political_controllers`), record casualties (both military and civilian), emit `control_events`, dissolve formation.

3. **`resolvePlayerParamilitaryDecisions(state)`** — Resolve player decisions from the pending requests queue after UI submission.

### 4.2 Pipeline integration

Two steps in `src/sim/turn_phases/war_phases.ts`, inserted after `partition-corps-front-sectors`:

- **`paramilitary-detect`** — Early return if turn > PARAMILITARY_FADE_WEEK or phase != 'war'. Calls `detectParamilitaryTargets()`.
- **`paramilitary-advance`** — Calls `advanceParamilitaries()`. Merges report into existing `context.report.paramilitary_sweep`.

### 4.3 State schema additions

In `src/state/game_state.ts`:

- `FormationKind` extended with `'paramilitary'`
- `FormationState` gains `paramilitary_target?: string` and `paramilitary_eta?: number`
- `ParamilitaryRequest` interface (target_osid, faction, strength, decision)
- `GameState` gains `pending_paramilitary_requests`, `paramilitary_policy`, `paramilitary_deployment_count`

### 4.4 Serialization

`src/state/serializeGameState.ts`: Three keys added to `GAMESTATE_TOP_LEVEL_KEYS`: `pending_paramilitary_requests`, `paramilitary_policy`, `paramilitary_deployment_count`.

### 4.5 Turn report

`src/sim/turn_pipeline_types.ts`: `TurnReport` gains `paramilitary_sweep?: ParamilitarySweepReport`.

### 4.6 Exclusions

- **Reinforcement:** `isEligibleForReinforcement()` returns false for `kind === 'paramilitary'`
- **Bot AI:** Paramilitary formations have no `corps_id`, so bot corps/brigade AI naturally skips them
- **Formation spawn:** Formation spawn logic filters on eligible kinds; `paramilitary` is not in the set
- **Defended OSID check:** `buildDefendedOsids()` excludes paramilitary from the defender set (they don't provide garrison defense)

---

## 5. Pocket detection algorithm

1. Build OSID adjacency graph from edge records
2. For each faction, call `analyzeFactionGraph()` which returns `enemy_pockets`: enemy-controlled OSIDs where ALL adjacent OSIDs are faction-controlled
3. For each pocket OSID:
   - Skip if already targeted by an existing paramilitary or pending request
   - Skip if defended by a non-paramilitary formation from a different faction
   - Apply deterministic hash: `deterministicHash(osid, turn) / 100` against faction spawn rate
   - If below threshold: spawn (bot) or add to pending requests (player)

The deterministic hash uses char code sum of the OSID string mixed with the turn number (`turn * 31`, then `hash * 37 + charCode` per character, mod 100). This produces stable, reproducible spawn decisions across reruns.

---

## 6. Capture and casualty flow

When a paramilitary unit reaches its target (ETA decremented to 0):

1. **Already faction-controlled** — Just dissolve (no casualties)
2. **Defended** — Take 3x normal casualties (24% of unit), dissolve without capturing
3. **Undefended** — Capture:
   - Flip `political_controllers[targetOsid]` to attacking faction
   - Emit `control_events` entry with `mechanism: 'combat'`
   - Record military casualties: `ceil(personnel * 0.08)` split into KIA/WIA/MIA via `recordBattleCasualties()`
   - Record civilian casualties: `ceil(5000 * 0.02)` = 100 killed against the losing faction's civilian ledger
   - Dissolve formation (`status: 'inactive'`, `lifecycle_status: 'disbanded'`)

---

## 7. Player agency

| Policy | Behavior |
|--------|----------|
| `'ask'` (default) | Each pocket generates a pending request; player decides per request |
| `'always_allow'` | Auto-approve all paramilitary deployments (like bot factions) |
| `'always_deny'` | Suppress all paramilitary activity for player faction |

Pending requests include `target_osid`, `faction`, `strength`. Player sets `decision: 'allow' | 'deny' | 'regular'`. Resolution via `resolvePlayerParamilitaryDecisions()`.

---

## 8. Test coverage

**`tests/paramilitary_sweep.test.ts`** — 14 tests across 4 describe blocks:

| Test group | Tests | Coverage |
|------------|-------|----------|
| detectParamilitaryTargets | 5 | Bot spawn, fade week cutoff, player pending requests, always_deny policy, defended pocket skip, duplicate prevention |
| advanceParamilitaries | 4 | ETA decrement + capture, ETA>0 no-capture, casualty ledger recording, already-captured dissolve |
| resolvePlayerParamilitaryDecisions | 3 | Approved spawn, clearing pending, deployment count tracking |
| isEligibleForReinforcement | 1 | Paramilitary exclusion |

All 365 vitest tests pass (36 suites). Typecheck clean.

---

## 9. 40w scenario results

Paramilitaries active in the 40-week calibration scenario:
- **20 formations spawned** (14 RS, 6 RBiH) — consistent with faction spawn rates
- **RS paramilitary casualties:** 156
- **RBiH paramilitary casualties:** 72
- **Civilian casualties recorded** against captured OSID populations
- **Calibration stable** at 84.9%/87.7% (count/area-weighted) — no regression from paramilitaries

---

## 10. Simplify pass

A full `/simplify` review was applied covering code reuse, quality, and efficiency:

- **Pre-built defender set**: `buildDefendedOsids()` creates `Set<string>` for O(1) lookup instead of O(N) per call
- **Shared casualty split**: `splitCasualties()` helper eliminates duplicate KIA/WIA/MIA calculations
- **Standardized ratios**: All casualty fractions aligned with combat system (0.30/0.55/0.15)
- **Extracted constants**: `PARAMILITARY_TARGET_AVG_POPULATION` and `PARAMILITARY_INITIAL_MORALE` from magic numbers
- **Report factory**: `emptyReport()` reduces copy-paste construction
- **Defense-in-depth**: Fade week check in both pipeline step AND `detectParamilitaryTargets()` function

---

## 11. Files changed

| File | Change |
|------|--------|
| `src/sim/combat/paramilitary_sweep.ts` | **NEW** — core module (~350 lines) |
| `src/state/game_state.ts` | `FormationKind` + `ParamilitaryRequest` + FormationState fields + GameState fields |
| `src/state/formation_constants.ts` | 10 paramilitary constants + `isEligibleForReinforcement` guard |
| `src/sim/turn_phases/war_phases.ts` | 2 pipeline steps (`paramilitary-detect`, `paramilitary-advance`) |
| `src/sim/turn_pipeline_types.ts` | `TurnReport.paramilitary_sweep` field |
| `src/state/serializeGameState.ts` | 3 keys in `GAMESTATE_TOP_LEVEL_KEYS` |
| `tests/paramilitary_sweep.test.ts` | **NEW** — 14 tests |
| `vitest.config.ts` | Test file added to include array |

---

## 12. Future work (not implemented)

- **Consequence scaling**: `paramilitary_deployment_count` is tracked but no IVP/legitimacy/patron consequences yet
- **Player UI**: Batch decision panel for pending paramilitary requests (warroom/map modal)
- **Per-army flavor**: Named paramilitary units (Arkan's Tigers, White Eagles, HOS) with historical characteristics
- **Enclave interaction**: Paramilitary behavior near enclaves/protected zones
- **International pressure**: Higher paramilitary activity could increase composite IVP

---

## 13. Canon propagation checklist

- [x] Implementation report (this document)
- [x] Systems Manual — implementation-note in §13 (recruitment/formation) referencing paramilitary kind
- [x] Engine Invariants — implementation-note for paramilitary formation lifecycle
- [x] CONSOLIDATED_BACKLOG — §3 entry updated to reflect implementation
- [x] CONSOLIDATED_IMPLEMENTED — entry added
- [x] CALIBRATION_MASTER — paramilitary subsystem note added
- [x] REPO_MAP — paramilitary sweep entry in "Change X -> Go Here"
- [x] MILITIA_BRIGADE_FORMATION_DESIGN — paramilitary section added
- [x] docs_index — no structural change needed (report in existing implemented/ folder)
- [x] README (40_reports) — entry added to §1 need table
- [x] PROJECT_LEDGER — entry appended
- [x] PROJECT_LEDGER_KNOWLEDGE — paramilitary knowledge entry added
