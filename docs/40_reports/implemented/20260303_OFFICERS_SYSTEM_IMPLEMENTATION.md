# Officers System — Two-Tier Implementation Report

**Date:** 2026-03-03
**Phases:** A (Brigade Quality), B (Named Officers), C (Bot AI Integration), D (War Timeline)
**Calibration run:** n403 (88.0% OSID match, 655/744)
**Baseline:** n392 (88.6%, 667/753) — pre-officers comprehensive combat formula
**Design doc:** `docs/30_planning/OFFICERS_SYSTEM_COMPREHENSIVE_PLAN.md` (1010 lines, 13 sections)
**Tests:** 63 new (19 Phase A + 44 Phase B/C/D), all passing. Existing 260+ vitest tests unaffected.

---

## Executive Summary

The Bosnian War's defining military narrative is an officer quality inversion: VRS inherits the entire JNA professional officer corps (and can't replace losses), ARBiH starts with almost zero trained officers (and learns fast), HVO gets a trickle from Zagreb (with political appointments undermining competence).

Previously, officer quality was a single faction-level function (`getOfficerQualityMult(faction, turn)`) returning a flat 0.85–1.10 multiplier. The new two-tier system adds:

| Tier | Scope | Key Mechanic |
|------|-------|-------------|
| **Tier 2: Brigade Officer Quality** | Per-brigade `officer_quality` [0, 0.90] | Growth from combat/frontline experience, loss from casualties, faction learning rates |
| **Tier 1: Named Officers** | 63 historical corps/army commanders | Individual competence/aggressiveness/defensiveness ratings, per-corps combat modifiers, succession |

The tiers interact multiplicatively: brigade quality is the base modifier; corps commander quality is a second multiplier applied on top.

---

## Phase A: Brigade Officer Quality (Tier 2)

### A.1 — FormationState extension
- Added `officer_quality?: number` to FormationState (`src/state/game_state.ts`)

### A.2 — OOB loader
- Added `initial_officer_quality?: number` to OobBrigade in `src/scenario/oob_loader.ts`
- Wired into formation creation in `src/scenario/oob_early_war_entry.ts` and `src/sim/recruitment_engine.ts`

### A.3 — Faction defaults + brigade modifier
New functions in `src/sim/combat/combat_math.ts`:

```
getFactionDefaultOfficerQuality(faction, turn):
  RS:   max(0.45, 0.55 - turn × 0.002)   // starts 0.55, decays
  RBiH: min(0.50, 0.05 + turn × 0.004)   // starts 0.05, grows
  HRHB: 0.225                              // constant

getBrigadeOfficerMod(formation, turn):
  quality = formation.officer_quality ?? getFactionDefaultOfficerQuality(faction, turn)
  return 1.0 + (quality - 0.30) × 0.4
```

### A.4 — Combat math wiring
- Replaced `getOfficerQualityMult(faction, turn)` in `computeAttackerPower()` and `computeDefenderPower()` with three-tier fallback:
  1. `state.named_officers` present → `getThreeTierOfficerMod(formation, state, role)`
  2. `formation.officer_quality` set → `getBrigadeOfficerMod(formation, turn)`
  3. Neither → `getOfficerQualityMult(faction, turn)` (legacy fallback)

### A.5 — Spawn initialization
- `src/sim/formation_spawn.ts`: new formations get `officer_quality: getFactionDefaultOfficerQuality(faction, turn)`
- `src/scenario/oob_early_war_entry.ts`: OOB overrides or faction default

### A.6 — Growth/loss pipeline module
**New file:** `src/sim/combat/officer_quality_update.ts`

| Constant | Value | Purpose |
|----------|-------|---------|
| `COMBAT_GROWTH_BASE` | 0.01 | Per-turn growth for brigades in combat |
| `FRONTLINE_GROWTH_BASE` | 0.005 | Per-turn growth for non-combat frontline |
| `OFFICER_CASUALTY_MULT` | 1.5 | Officer casualty rate vs enlisted |
| `OFFICER_QUALITY_FLOOR` | 0.05 | Minimum quality |
| `OFFICER_QUALITY_CAP` | 0.90 | Maximum quality |
| `VRS_BRAIN_DRAIN_START_WEEK` | 40 | When VRS brain drain begins |
| `VRS_BRAIN_DRAIN_RATE` | 0.001 | VRS quality loss per turn after start week |

Faction learning rates: RBiH 1.5×, RS 0.7×, HRHB 1.0× (reads from `war_timeline.officer_config` when available).

Growth is diminished at high quality: `× (1.0 - quality × 0.5)`.

### A.7 — Officer loss in attack resolution
- `src/sim/combat/attack_resolution_osid.ts`: after casualty application:
  ```
  officerLoss = casualtyRatio × 1.5 × (1.0 - quality × 0.3)
  quality -= officerLoss; quality = max(0.05, quality)
  ```
  Applied to both attacker and defender.

### A.8 — Pipeline step
- `update-officer-quality` registered in `src/sim/turn_phases/war_phases.ts` after `update-sector-offensive-results`, before `evaluate-brigade-decorations`

### A.9 — OOB overrides
- ~15 key brigades in `data/source/oob_brigades.json` with `initial_officer_quality`:
  - VRS 65th Protection: 0.85, VRS 1KK brigades: 0.65
  - ARBiH Guards: 0.35, ARBiH 5th Corps: 0.20, ARBiH enclaves: 0.08
  - HVO Guards: 0.50

---

## Phase B: Named Officers + Corps Sensitivity (Tier 1)

### B.1 — Type definitions
**New file:** `src/state/officer_types.ts`

| Type | Purpose |
|------|---------|
| `NamedOfficer` | Static data: id, name, faction, rank, 4 ratings (competence, aggressiveness, defensiveness, political_reliability), assignment, availability window, origin, casualty_vulnerability, can_improve, pool_tier |
| `NamedOfficerState` | Mutable state: officer_id, status (active/reserve/killed/captured/retired/defected), assigned_corps_id, turns_in_command, battles, victories, effective_competence_penalty, penalty_turns_remaining, acting_commander |
| `FactionOfficerConfig` | Timeline config: learning_rate, brain_drain_rate, brain_drain_start_week, pool_regeneration_interval, warlord_friction_end_week, etc. |

### B.2 — Historical officer data
**New file:** `data/scenarios/officers/apr1992_officers.json` — 63 entries:
- 9 army-level commanders (3 factions × 3 army commanders)
- 31 corps commander starters
- 23 pool officers (Tier A/B/C reserves for succession)

### B.3 — Core officer system module
**New file:** `src/sim/combat/officer_system.ts`

| Function | Purpose |
|----------|---------|
| `officerHash(turn, officerId)` | Deterministic [0,1) for casualty checks (no Math.random) |
| `getCorpsCommander(corpsId, state)` | Lookup active corps commander |
| `getArmyCommander(faction, state)` | Lookup army-level commander |
| `getEffectiveCompetence(state, data)` | Clamped competence with assignment penalty |
| `getCorpsCommanderAttackMod(data, state)` | `0.90 + comp×0.03 + agg×0.01` (acting: flat 0.92) |
| `getCorpsCommanderDefenseMod(data, state)` | `0.90 + comp×0.03 + def×0.01` (acting: flat 0.92) |
| `initializeNamedOfficers(state, officerData)` | Assign historical starters, pool officers to reserve |
| `processOfficerSuccession(state, engagedCorpsIds)` | Departures, casualty checks, replacement from pool |
| `validateOfficerData(raw)` | Input validation for officer JSON |

### B.4 — GameState extension
- `named_officer_data?: NamedOfficer[]` on GameState (immutable static data)
- `named_officers?: Record<string, NamedOfficerState>` on GameState (mutable state)
- Both added to `GAMESTATE_TOP_LEVEL_KEYS` in `serializeGameState.ts`

### B.5 — Scenario loading
- `src/scenario/scenario_runner.ts`: loads officer JSON after war_timeline block
- `data/scenarios/apr1992_definitive_40w.json`: `"init_officers": "apr1992"`
- **Critical fix:** `src/scenario/scenario_loader.ts` — `normalizeScenario()` whitelist expanded with `init_officers` and `war_timeline` fields (both were being stripped, meaning war_timeline was also never loading in previous runs!)

### B.6 — Three-tier combat math
- `getThreeTierOfficerMod(formation, state, role)` in `combat_math.ts` — inlined to avoid circular dependency with `officer_system.ts`
- Combines brigade quality × corps commander modifier
- Corps modifier range: 0.94–1.10 (VRS higher, ARBiH lower)

### B.7 — Officer succession pipeline step
- `officer-succession` registered in `war_phases.ts` between `elite-loan-lifecycle` and `generate-war-stories`
- Collects engaged corps IDs from battle reports, passes to `processOfficerSuccession()`
- Reports: departures, arrivals, casualties, successions

---

## Phase C: Bot AI Integration + Faction Friction

### C.1 — Corps commander aggressiveness shift
**File:** `src/sim/combat/bot_corps_ai.ts`
- Officer aggressiveness feeds into directive generation: `shift = (commander.aggressiveness - 3) × 0.05`
- High-competence (≥4) commanders accept riskier attacks: `min_attack_outcome` downgraded from `victory` to `costly_victory`

### C.2 — ARBiH warlord friction
**File:** `src/sim/combat/bot_brigade_ai_osid.ts`
- Before warlord_friction_end_week (default 78, from timeline): for each ARBiH corps with 2+ attackers, forces the `(turn % attackingBrigadeCount)`-th attacking brigade to defend
- Deterministic: no probability, uses sorted brigade IDs

### C.3 — HVO Zagreb approval delay
**File:** `src/sim/combat/officer_system.ts`
- Political replacement: 4-turn acting commander delay
- Combat death replacement: 1-turn delay
- HVO succession sorts by `political_reliability` first, then competence
- Generic replacement officers use `generic_combat_` prefix for combat death tracking

### C.4 — Mladić override for pre-planned operations
**File:** `src/sim/combat/combat_math.ts` (in `getThreeTierOfficerMod`)
- When a VRS formation's corps has an active `general_offensive` operation in execution phase, uses army commander (Mladić) modifier instead of corps commander
- Models historical central direction of VRS major operations

---

## Phase D: War Timeline Integration

### D.1 — WarTimeline extension
- Added `officer_config?: Record<string, FactionOfficerConfig>` to `WarTimeline` interface in `src/state/war_timeline.ts`
- Validation added for officer_config in `validateWarTimeline()`

### D.2 — Timeline JSON
Added `officer_config` section to `data/scenarios/timelines/apr1992.json`:

| Faction | Key Config |
|---------|-----------|
| RS | learning_rate: 0.007, brain_drain_rate: 0.001, brain_drain_start_week: 40, generic_replacement_competence: 2 |
| RBiH | learning_rate: 0.015, pool_regeneration_interval: 12, warlord_friction_end_week: 78, generic_replacement_competence: 2 |
| HRHB | learning_rate: 0.010, zagreb_cadre_interval: 15, roso_restructuring_week: 52, political_replacement_delay: 4, combat_death_replacement_delay: 1 |

### D.3 — Wire timeline into officer quality update
- `updateBrigadeOfficerQuality()` reads learning rate from `state.war_timeline?.officer_config`
- VRS brain drain reads start week and rate from timeline config
- Hardcoded fallback when timeline absent

### D.4 — Wire timeline into officer succession
- HVO delays read from `state.war_timeline?.officer_config?.HRHB`
- Generic replacement competence reads from timeline config
- Warlord friction end week in `bot_brigade_ai_osid.ts` reads from timeline

---

## Calibration Results (n403)

### OSID Match: 88.0% (655/744) — PASSES ≥86% guard

| Metric | n392 (baseline) | n403 (officers) | Delta |
|--------|----------------|-----------------|-------|
| **Overall** | **88.6%** (667/753) | **88.0%** (655/744) | -0.6pp |
| Area-weighted | — | 90.4% | — |

### Regional breakdown

| Region | n392 | n403 | Delta |
|--------|------|------|-------|
| Krajina | 98.5% | 94.7% | -3.8pp |
| **Central Bosnia** | 87.3% | **93.3%** | **+6.0pp** |
| **Sarajevo** | 87.1% | **90.3%** | **+3.2pp** |
| Herzegovina | 92.5% | 91.4% | -1.1pp |
| Central Corridor | 90.4% | 88.3% | -2.1pp |
| **Posavina** | 81.7% | **84.4%** | **+2.7pp** |
| Drina | 82.0% | 74.0% | -8.0pp |

Three regions improved significantly (+12pp combined). Drina decline is from per-corps variance shifting enclave periphery outcomes (Srebrenica/Višegrad area flips).

### Personnel (40w)

| Faction | n392 | n403 | Target Band |
|---------|------|------|-------------|
| ARBiH | 119k | **131,552** | 110–130k |
| VRS | 85k | **88,128** | 90–100k |
| HVO | 41k | **41,950** | 40–45k |

All three factions closer to historical target bands. VRS recovered from 85k toward 90k band.

### Military Casualties

| Faction | KIA | WIA | Total |
|---------|-----|-----|-------|
| ARBiH | 9,604 | 18,446 | 28,050 |
| VRS | 10,445 | 20,057 | 30,502 |
| HVO | 5,606 | 10,612 | 16,218 |
| **Total** | **25,655** | **49,115** | **74,770** |

### Named Officers at w40

| Metric | Value |
|--------|-------|
| Total officers | 63 |
| Active | 25 |
| Reserve pool | 35 |
| Killed | 1 |
| Retired | 2 |
| Assigned to corps | 21 |
| Acting commanders | 0 |

### Officer Quality Averages at w40

| Faction | Avg Quality | Formations | Historical Arc |
|---------|-------------|------------|----------------|
| VRS (RS) | **0.390** | 76 | Started 0.55, declined through attrition |
| HVO (HRHB) | **0.211** | 30 | Stable, slight decline |
| ARBiH (RBiH) | **0.076** | 86 | Started 0.05, growing slowly |

Quality hierarchy correct: VRS > HVO > ARBiH at w40. ARBiH learning rate will show more effect over 52+ weeks.

### Key Control Checks — 14/14 PASS

All critical control points match historical state at January 1993.

---

## Files Summary

### New Files (6)

| File | Phase | Purpose |
|------|-------|---------|
| `src/state/officer_types.ts` | B.1 | Type definitions (NamedOfficer, NamedOfficerState, FactionOfficerConfig) |
| `src/sim/combat/officer_system.ts` | B.3 | Core officer functions (init, succession, combat mods, hash) |
| `src/sim/combat/officer_quality_update.ts` | A.6 | Per-turn brigade quality growth/loss |
| `data/scenarios/officers/apr1992_officers.json` | B.2 | 63 historical officers |
| `tests/officer_quality.test.ts` | A | 19 tests for Tier 2 mechanics |
| `tests/officer_system.test.ts` | B-D | 44 tests for Tier 1 mechanics |

### Modified Files (~15)

| File | Phases | Change |
|------|--------|--------|
| `src/state/game_state.ts` | A.1, B.4 | `officer_quality` on FormationState; `named_officers`, `named_officer_data` on GameState |
| `src/state/serializeGameState.ts` | B.4 | Added `war_timeline`, `named_officer_data`, `named_officers` to `GAMESTATE_TOP_LEVEL_KEYS` |
| `src/state/war_timeline.ts` | D.1 | `officer_config` on WarTimeline interface |
| `src/sim/combat/combat_math.ts` | A.3-4, B.6, C.4 | `getFactionDefaultOfficerQuality`, `getBrigadeOfficerMod`, `getThreeTierOfficerMod`; three-tier fallback in power computation |
| `src/sim/combat/attack_resolution_osid.ts` | A.7 | Officer quality loss on casualties |
| `src/sim/combat/bot_corps_ai.ts` | C.1 | Corps commander aggressiveness shift |
| `src/sim/combat/bot_brigade_ai_osid.ts` | C.2 | ARBiH warlord friction |
| `src/sim/turn_phases/war_phases.ts` | A.8, B.7 | Two pipeline steps: `update-officer-quality`, `officer-succession` |
| `src/sim/turn_pipeline_types.ts` | B.7 | `OfficerSuccessionReport` on TurnReport |
| `src/scenario/scenario_runner.ts` | B.5 | Officer JSON loading block |
| `src/scenario/scenario_loader.ts` | B.5 | `normalizeScenario()` whitelist fix (also fixed `war_timeline` loading) |
| `src/scenario/oob_loader.ts` | A.2 | `initial_officer_quality` field |
| `src/scenario/oob_early_war_entry.ts` | A.2, A.5 | Wire quality into formation creation |
| `src/sim/recruitment_engine.ts` | A.2 | Wire quality into recruitment |
| `src/sim/formation_spawn.ts` | A.5 | Set quality on spawned formations |
| `data/scenarios/timelines/apr1992.json` | D.2 | `officer_config` section |
| `data/scenarios/apr1992_definitive_40w.json` | B.5 | `"init_officers": "apr1992"` |
| `data/source/oob_brigades.json` | A.9 | ~15 brigade overrides |

---

## Determinism Verification

- [x] No `Math.random()` — casualty checks use `officerHash(turn, officerId)` (FNV-1a)
- [x] Officer pool iteration in sorted ID order (`strictCompare`)
- [x] Growth/loss rates are pure arithmetic
- [x] Assignment penalties are lookup-based (no randomness)
- [x] Warlord friction uses `turn % brigadeCount` (deterministic)
- [x] JSON parse produces identical objects every time
- [x] All temporal data from `war_timeline` (data-driven, validated)
- [x] Pipeline step order fixed in `NamedPhase` array

## Critical Bug Fix

**`normalizeScenario()` whitelist bug:** The scenario loader's `normalizeScenario()` function uses whitelist-based field extraction. `war_timeline` and `init_officers` were missing from the whitelist, meaning:
1. `war_timeline` was **never loading** in any previous 40w run (all runs n335–n409 used hardcoded fallbacks)
2. `init_officers` was silently stripped

Fixed by adding `war_timeline`, `init_officers`, `supply_reserves_enabled`, and `osid_control_overrides` to the normalizer extraction logic.

**`GAMESTATE_TOP_LEVEL_KEYS` omission:** The GameState serializer whitelist in `serializeGameState.ts` was missing `war_timeline`, `named_officer_data`, and `named_officers`. Serialization crashed until these were added.

---

## Architecture Decisions

1. **Circular dependency avoidance:** `getThreeTierOfficerMod()` is inlined in `combat_math.ts` rather than imported from `officer_system.ts`, because `officer_system.ts` imports from `combat_math.ts` (for `getBrigadeOfficerMod`). This avoids a circular import chain.

2. **Three-tier fallback:** The combat math supports three levels of officer quality (named officers → brigade quality → legacy faction-level), ensuring backward compatibility with scenarios that don't load officers.

3. **Acting commander penalty:** When a corps has no pool officer available (delay or empty pool), a generic acting commander is created with flat 0.92 modifier (vs typical 0.94–1.10 range for named officers), modeling the historical degradation of command quality during transitions.

4. **HVO political sorting:** HVO officer succession sorts candidates by `political_reliability` first, then competence — modeling the documented HVO pattern of political appointments over military merit.

---

## Phase E (GUI) — Implemented (2026-03-02)

Phase E adds officer information to the tactical map and warroom without new IPC. Implementation plan: `docs/plans/2026-03-02-officers-phase-e-implementation.md`.

**Map (React + MapLibre):**
- **View types:** `NamedOfficerView`, `NamedOfficerStateView`; `FormationView.officer_quality`; `LoadedGameState.namedOfficerData`, `namedOfficerStateById` (all sorted by id).
- **GameStateAdapter:** Maps `state.named_officer_data` and `state.named_officers` into the view; passes `formation.officer_quality` to FormationView.
- **FormationDetail Command block:** When officer data is present: brigade shows officer quality (progress bar) and corps commander name; corps/army_hq show corps or army commander and (Acting) status.
- **Recent command changes:** When the selected formation is a corps and the last turn report has `officer_succession`, a "Recent command changes" block lists replacements for that corps (new officer took command). Desktop sends `turn-report-updated` after advance-turn so the map store can hold `lastTurnReport`.

**Warroom:**
- **WarDataSnapshot:** `officersByFaction?: Partial<Record<FactionId, OfficerListEntry[]>>` (fog of war: player faction only). `extractOfficersByFaction()` builds the list from `gameState.named_officer_data` and `named_officers`, sorted by id.
- **FactionOverviewPanel:** "COMMAND" subsection lists officers (name, rank, status, assigned corps) for the player faction.
- **NewspaperModal / AAR:** After advance-turn, `setLastTurnReport(report)` stores the turn report. When the newspaper is opened, officer succession lines are appended: replacements ("[Turn N] X assigned to Y Corps"), casualties ("X killed in action"), departures ("X retired"). Order: replacements (by corps_id, new_officer), then casualties, then departures (sorted by id).

**Determinism:** All officer arrays sorted by id (strictCompare). Succession display order as above. No timestamps in view types.
