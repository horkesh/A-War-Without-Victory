# Recruitment System Implementation Report

## Overview

Three-resource recruitment system replacing the legacy auto-spawn of all 261 OOB brigades. Players (and bot AI) now spend **manpower**, **recruitment capital**, and **equipment points** to activate brigades from the OOB catalog, creating force structure trade-offs and the "coverage problem" described in the design note.

Backward compatible: existing scenarios using `init_formations_oob: true` are unaffected.

## Architecture

### Activation Path

```
Scenario JSON
  recruitment_mode: "player_choice"    <-- new field
  recruitment_capital: { RS: 250, ... }
  equipment_points: { RS: 300, ... }
        |
        v
scenario_runner.ts
  if recruitment_mode === "player_choice":
    initializeRecruitmentResources()   <-- creates per-faction pools
    runBotRecruitment()                <-- greedy scored algorithm
  else:
    createOobFormationsAtPhaseIEntry() <-- legacy path (unchanged)
```

### Three Resources

| Resource | Source | Spent On | Default Values |
|----------|--------|----------|----------------|
| Manpower | Militia pools (`militia_pools[mun:faction].available`) | Per-brigade `manpower_cost` (default 800) | From pool population |
| Recruitment Capital | Scenario config or faction defaults | Per-brigade `capital_cost` (default 10) | RS: 250, RBiH: 150, HRHB: 100 |
| Equipment Points | Scenario config or faction defaults | Per-class cost (mechanized: 40, motorized: 20, mountain: 5, light_infantry: 0) | RS: 300, RBiH: 60, HRHB: 120 |

### Equipment Classes

Seven classes mapping to starting `BrigadeComposition`:

| Class | Infantry | Tanks | Artillery | AA | Cost |
|-------|----------|-------|-----------|-----|------|
| mechanized | 800 | 12 | 6 | 2 | 40 |
| motorized | 850 | 4 | 4 | 1 | 20 |
| mountain | 800 | 0 | 2 | 0 | 5 |
| light_infantry | 800 | 0 | 1 | 0 | 0 |
| garrison | 600 | 0 | 2 | 1 | 5 |
| police | 500 | 0 | 0 | 0 | 0 |
| special | 400 | 0 | 0 | 0 | 5 |

Auto-downgrade chain when equipment scarce: mechanized -> motorized -> mountain -> light_infantry.

## Files Created

| File | Purpose |
|------|---------|
| `src/state/recruitment_types.ts` | Type definitions, equipment class templates, resource pool interfaces, cost helpers, downgrade logic |
| `src/sim/recruitment_engine.ts` | Recruitment engine: single-brigade recruitment, bot AI scoring, mandatory-first logic, emergent suppression |
| `data/source/equipment_class_templates.json` | Reference data for equipment class compositions |
| `tests/recruitment_engine.test.ts` | 12 unit tests covering all core paths |

## Files Modified

| File | Changes |
|------|---------|
| `src/state/formation_constants.ts` | `MAX_BRIGADE_PERSONNEL`: 1000 -> 3000. Added `REINFORCEMENT_RATE` (200/turn), `COMBAT_REINFORCEMENT_RATE` (100/turn) |
| `src/state/game_state.ts` | Added `recruitment_state?: RecruitmentResourceState` to `GameState` |
| `src/scenario/scenario_types.ts` | Added `recruitment_mode`, `recruitment_capital`, `equipment_points` to `Scenario` |
| `src/scenario/scenario_loader.ts` | Parses new recruitment fields with `normalizeResourceRecord()` |
| `src/scenario/oob_loader.ts` | Extended `OobBrigade` with 7 recruitment cost fields (backward-compatible defaults) |
| `src/sim/formation_spawn.ts` | Rate-limited reinforcement (200/turn, 100 in combat), readiness gating, emergent formation suppression |
| `src/scenario/scenario_runner.ts` | Integrated recruitment path at Phase I entry and Phase 0 -> Phase I transitions |
| `tests/oob_phase_i_entry.test.ts` | Updated test fixtures for new `OobBrigade` shape |

## Bot AI Algorithm

The bot recruits in two passes per faction:

**Pass 1 -- Mandatory brigades** (corps HQs, key garrisons):
- Zero capital and equipment cost
- Manpower still deducted from home municipality pool
- Readiness starts at `active` with +10 cohesion bonus

**Pass 2 -- Elective brigades** scored by four dimensions:

```
score = (100 - priority)           // OOB catalog priority (lower = recruited first)
      + strategicAreaScore         // faction-specific municipality value [0-50]
      + frontlineProximity         // contested=20, highly_contested=30
      + equipmentClassValue        // mechanized=20, motorized=15, etc.
```

Brigades sorted by score descending, recruited greedily until resources exhausted. Equipment auto-downgrades when points are scarce.

### Strategic Area Scoring

Per-faction municipality value maps encode historically contested areas:

- **RS**: Brcko corridor (50), Banja Luka (50), Pale (45), Zvornik (40)
- **RBiH**: Sarajevo (50), Bihac (45), Tuzla (45), Zenica (40), enclaves (40)
- **HRHB**: Mostar (50), Vitez (40), Livno (40), Busovaca (35)

## Enhanced Reinforcement System

`reinforceBrigadesFromPools()` changes:

| Property | Before | After |
|----------|--------|-------|
| Max personnel | 1,000 | 3,000 |
| Rate limit | Unlimited per turn | 200/turn (100 in combat) |
| Readiness gate | None | `degraded` and `forming` brigades skip |
| Combat detection | None | `posture === 'attack'` or `disrupted === true` |
| Emergent suppression | None | Suppressed when recruited OOB brigade covers (mun, faction) |

## Emergent Formation Suppression

When `recruitment_state` exists on GameState, `spawnFormationsFromPools()` checks each (municipality, faction) pair: if a recruited OOB brigade already exists there, emergent militia-to-brigade spawn is suppressed. This forces the coverage problem -- ungarrisoned municipalities must rely on militia emergence or remain undefended.

## Test Results

- TypeScript: clean compile (`tsc --noEmit` passes)
- 12 new recruitment engine tests: all pass
- 4 OOB phase I entry tests: all pass
- 3 OOB loader tests: all pass
- 5 militia rework tests: all pass
- 85 vitest suite tests: all pass
- 2 pre-existing phase I turn structure test failures: unchanged (not caused by this work)

## Usage

Scenario JSON to activate the recruitment system:

```json
{
  "scenario_id": "example_recruitment",
  "start_phase": "phase_i",
  "weeks": 52,
  "init_control": "apr1992",
  "recruitment_mode": "player_choice",
  "recruitment_capital": { "RS": 250, "RBiH": 150, "HRHB": 100 },
  "equipment_points": { "RS": 300, "RBiH": 60, "HRHB": 120 },
  "use_smart_bots": true
}
```

Omitting `recruitment_mode` or setting it to `"auto_oob"` preserves legacy behavior.

## Refactor Pass

A post-implementation refactor pass cleaned up dead code, redundant logic, and over-engineered stubs.

### Dead Code Removed

| Item | File | Rationale |
|------|------|-----------|
| `RecruitableBrigade` interface | `recruitment_types.ts` | Never imported; `OobBrigade` from `oob_loader.ts` is the actual type used everywhere |
| `PreWarOutput` interface | `recruitment_types.ts` | Forward reference for unbuilt pre-war phase; removed along with unused `MunicipalityId` import |
| `getMaxPersonnelForBrigade()` stub | `formation_spawn.ts` | Function that only returned `MAX_BRIGADE_PERSONNEL`; inlined as direct constant reference |

### Duplication Eliminated

**Scenario runner OOB creation (3 blocks -> 1 helper)**

Before: Three near-identical blocks in `scenario_runner.ts` each checking `recruitment_mode`, calling `initializeRecruitmentResources()` + `runBotRecruitment()` or falling back to `createOobFormationsAtPhaseIEntry()`:
1. Initial Phase I startup (lines 484-518)
2. Phase 0 -> Phase I transition in phase_0 turn path (lines 653-662)
3. Phase 0 -> Phase I transition in phase_ii turn path (lines 676-685)

After: Single `createOobFormations()` helper (lines 273-305) called from all three sites as one-liners.

**Formation construction (2 inline builders -> 1 shared helper)**

Before: `recruitBrigade()` and the mandatory path in `runBotRecruitment()` each built `FormationState` objects inline with duplicated tag construction, composition building, and readiness/cohesion logic.

After: `buildRecruitedFormation()` and `buildRecruitmentTags()` helpers in `recruitment_engine.ts` shared by both paths.

### Verification

All changes verified with clean `tsc --noEmit` and all tests passing:
- 12 recruitment engine tests: pass
- 4 OOB phase I entry tests: pass
- 3 OOB loader tests: pass
- 5 militia rework tests: pass
- 86 vitest suite tests: pass

## Future Work

- **OOB data enrichment**: Add per-brigade `manpower_cost`, `capital_cost`, `default_equipment_class`, `priority`, `mandatory` fields to `oob_brigades.json` (currently all use defaults)
- **Pre-war phase linkage**: Define and wire pre-war phase output to recruitment resources when Phase 0 mechanics are implemented
- **Player UI**: `recruitBrigade()` API is ready for human player integration; bot AI currently handles all factions
- **Per-brigade max_personnel**: `max_personnel` field on OOB entries is loaded but reinforcement currently uses the global `MAX_BRIGADE_PERSONNEL` constant
- **Equipment trickle**: Per-turn equipment income from patron states (not yet implemented)
