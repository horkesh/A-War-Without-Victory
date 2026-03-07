# Operations System: Commander Assignment + Faction Name Pools

**Date:** 2026-03-07
**Runs:** n265 (40w), n267 (52w)
**Status:** Implemented, verified, calibration-neutral
**Supersedes:** [20260307_OPERATIONS_COMMANDER_FEATURE.md](20260307_OPERATIONS_COMMANDER_FEATURE.md) (folded into this report)

## Overview

Two related enhancements to the named operations system:

1. **Operations Commander** -- Named officers from the reserve pool command operations, providing chain-of-command isolation during execution phase.
2. **Faction-Specific Operation Name Pools** -- Historically researched, faction-flavored name pools with sequential consumption (no repeats per game).

Both are calibration-neutral: they change *who* commands and *what* operations are named, not combat outcomes.

---

## Part 1: Operations Commander

### Motivation

1. **Historical accuracy:** Bosnian War operations were often commanded by officers distinct from the standing corps commander -- pulled from reserve or transferred temporarily.
2. **Chain-of-command isolation:** Brigades in an active operation should answer to the operation's commander, not the corps' standing commander.
3. **Officer attributes affect operations:** A skilled/aggressive commander makes an operation more effective; a defensive specialist provides better holding power during recovery.

### Commander Selection

`selectOperationCommander()` in `officer_system.ts`:

- **Candidates:** Reserve-status officers with rank `corps_commander`, same faction, not already commanding another operation
- **Selection priority:**
  1. `home_corps_id` matches the launching corps (regional match)
  2. `compatible_corps_ids` includes the corps
  3. Any reserve officer of the same faction
- **Within each tier:** Sort by competence (desc), aggressiveness (desc), then officer ID (deterministic)
- **Pure selection:** Returns officer ID only; no state mutation (mutation handled by `assignOperationCommander`)

### Combat Integration

In `combat_math.ts:getThreeTierOfficerMod()`:

- If a brigade is in an executing operation with a `commander_officer_id`, the operation commander's modifier replaces the corps commander's modifier
- Formula unchanged: `0.90 + comp x 0.03 + agg x 0.01` (attack) / `0.90 + comp x 0.03 + def x 0.01` (defense)
- Only during `execution` phase -- planning and recovery brigades still use corps commander
- Inlined in `combat_math.ts` to avoid circular dependency with `officer_system.ts`

### Lifecycle

1. **Assignment:** `assignOperationCommander()` called at all operation creation points (pre-planned, triggered, bot-generated, queued injection). Sets `op.commander_officer_id`, officer `status: 'active'`, `assigned_operation: <op_name>`.
2. **Active duty:** Officer serves for the duration of the operation.
3. **Release:** `releaseOperationCommander()` called when operation enters recovery completion. Returns officer to `status: 'reserve'`, clears `assigned_operation`.

### Wiring Points

| Operation Type | Assignment Call Site | Release Call Site |
|----------------|---------------------|-------------------|
| Bot general offensive | `bot_corps_ai.ts:generateCorpsOperationOrders` | `bot_corps_ai.ts:evaluateOperationProgress` |
| Bot corridor breach | `bot_corps_ai.ts:attemptCorridorBreach` | (via recovery clearing) |
| Bot emergency defense | `bot_corps_ai.ts:generateEmergencyDefensiveOperations` | (via recovery clearing) |
| Bot sector offensive | `bot_corps_ai.ts:generateCorpsDirectives` | `sector_offensive.ts:advanceSectorOffensives` |
| Pre-planned (VRS) | `pre_planned_operations.ts:injectPrePlannedOperations` | `corps_command.ts:advanceOperations` |
| Queued injection | `pre_planned_operations.ts:injectQueuedOperation` | `corps_command.ts:advanceOperations` |
| Triggered | `triggered_operations.ts:checkTriggeredOperations` | `corps_command.ts:advanceOperations` |

---

## Part 2: Faction-Specific Operation Name Pools

### Motivation

The original name pools had several issues:
- Names repeated across factions (e.g. "Operacija Drina" in both RS and RBiH pools)
- Geographic names dominated, lacking military character
- No uniqueness tracking -- the same name could be assigned to multiple operations in one game
- Pre-planned/triggered operation names collided with pool names

### Design

Each faction gets ~40 names following historically accurate naming conventions:

**VRS (RS) -- JNA bureaucratic style (40 names)**
- 13 historical: Vrbas, Lukavac, Sadejstvo, Zvijezda, Brana, Breza, Stit, Jesen, Pauk, Plamen, Krivaja, Stupchanica, Vaganj
- 27 placeholders: Nature (Hrast/Oak, Bor/Pine, Topola/Poplar), fortification (Bedem/Rampart, Bastion, Redut/Redoubt), minerals (Celik/Steel, Gvozdje/Iron), force (Grom/Thunder, Munja/Lightning, Vihor/Whirlwind)

**ARBiH (RBiH) -- Evolved identity: weather, animals, aspirational, Islamic (40 names)**
- 13 historical: Neretva, Proljece, Tigar-Sloboda, Grmec, Domet, Zora, Majevica, Tekbir, Trokut, Crveni Lav, Farz, Uragan, Sana
- 27 placeholders: Aspirational (Nada/Hope, Pravda/Justice, Ponos/Pride), Islamic terms (Sabur/Patience, Sahin/Peregrine, Dzihad/Struggle, Ihlas/Sincerity), weather (Oluja/Storm, Kisa/Rain, Lavina/Avalanche)

**HVO (HRHB) -- Croatian tradition: weather, force, action (36 names)**
- 8 historical: Lipanjske Zore, Bura, Cincar, Zima, Skok, Ljeto, Maestral, Juzni Potez
- 28 placeholders: Adriatic winds (Jugo/Sirocco, Vjetar/Wind), force (Bljesak/Flash, Udar/Strike, Cekic/Hammer, Nakovanj/Anvil), animals (Guja/Viper, Kobac/Sparrowhawk, Kuna/Marten), martial (Juris/Assault, Ostrica/Blade, Sjekira/Axe)

### Reserved Names (excluded from pools)

Pre-planned and triggered operations use explicit names that are NOT in the pools:
- Koridor, Drina, Visegrad, Prsten, Foca, Prijedor, Bosanski Novi (pre-planned)
- Posavina Corridor, Kotor Varos, Jajce, Cerska-Kamenica (triggered)

### Sequential Consumption

`pickOperationName(corpsId, turn, faction, state)` in `operation_names.ts`:

1. Hash `corpsId:turn` to determine starting index in the faction pool
2. Scan forward for the first name NOT in `state.used_operation_names`
3. Mark the chosen name with the turn number
4. If pool exhausted: recycle with numeric suffix (" 2")
5. Absolute fallback: `Operacija <turn>-<corps_suffix>` (unreachable in practice with 40+ names)

**State:** `GameState.used_operation_names: Record<string, number>` -- serialized, persisted across saves.

---

## Part 3: Simplify Pass

A post-implementation simplify pass removed dead code and cleaned up patterns:

1. **Removed dead code (~65 lines):** `getOfficerCombatModWithOps`, `getOperationCommander`, `getOperationCommanderAttackMod`, `getOperationCommanderDefenseMod` -- all were exported but never called. The runtime path in `combat_math.ts` inlines the formula (justified by circular dependency).
2. **Fixed write-then-overwrite mutation:** `selectOperationCommander` was mutating officer state and writing a potentially wrong `assigned_operation` value, then `assignOperationCommander` immediately overwrote it. Fixed: `selectOperationCommander` is now pure selection (returns ID only); `assignOperationCommander` handles all mutation.
3. **Extracted `markUsed` helper:** Eliminated 3x repetition of the `used_operation_names` marking pattern in `pickOperationName`.

---

## State Changes

**`CorpsOperation`** (game_state.ts):
- Added: `commander_officer_id?: string`

**`NamedOfficerState`** (officer_types.ts):
- Added: `assigned_operation?: string`

**`GameState`** (game_state.ts):
- Added: `used_operation_names?: Record<string, number>`

**Serialization** (serializeGameState.ts):
- Added `'used_operation_names'` to `GAMESTATE_TOP_LEVEL_KEYS` allowlist

## Files Modified

| File | Change |
|------|--------|
| `src/state/game_state.ts` | Added `commander_officer_id` to `CorpsOperation`, `used_operation_names` to `GameState` |
| `src/state/officer_types.ts` | Added `assigned_operation` to `NamedOfficerState` |
| `src/state/serializeGameState.ts` | Added `used_operation_names` to allowlist |
| `src/sim/combat/officer_system.ts` | Added `selectOperationCommander`, `assignOperationCommander`, `releaseOperationCommander` |
| `src/sim/combat/combat_math.ts` | Added operation commander check in `getThreeTierOfficerMod` |
| `src/sim/combat/operation_names.ts` | Complete rewrite: 3 faction pools, sequential consumption, `GameState` tracking |
| `src/sim/combat/bot_corps_ai.ts` | Wired `assignOperationCommander` (4 points) + `releaseOperationCommander` (1 point) |
| `src/sim/combat/sector_offensive.ts` | Wired `releaseOperationCommander` + passed `state` to `pickOperationName` |
| `src/sim/combat/corps_command.ts` | Wired `releaseOperationCommander` at recovery clearing |
| `src/sim/combat/pre_planned_operations.ts` | Wired `assignOperationCommander` (2 injection points) |
| `src/sim/combat/triggered_operations.ts` | Wired `assignOperationCommander` at injection point |
| `data/scenarios/apr1992_definitive_52w.json` | Added missing `init_officers: "apr1992"` |
| `tests/sector_offensive.test.ts` | Added sequential consumption test |

## Verification

- **TypeScript:** Clean (`npx tsc --noEmit`)
- **Tests:** 351 pass, 1 skipped (35 suites)
- **40w scenario (n265):** 5 active operations with named commanders:
  - Galic -> Operacija Vlasic
  - Lisica -> Operacija Jahorina
  - Pandurevic -> Operacija Zvijezda
  - Samardzija -> Operacija Majevica
  - Zeljaja -> Operacija Lukavac
- **52w scenario (n267):** Officers loaded correctly (was broken before `init_officers` fix). All 4 triggered operations fire (Cerska-Kamenica at w45-47).
- **ATH:** 84.4% area-weighted (unchanged)
- **Troop strengths:** RS 106.6k, RBiH 125.9k, HRHB 37.6k (within calibration bands)

## Calibration Impact

None. The features change *which* officer's modifier applies (operation commander vs corps commander) and *what* operations are named (faction-specific pools vs shared geographic), but do not change the modifier formula or combat outcomes on the same deterministic seed.

## Canon Propagation

- Systems Manual v0.6.0 SS 7.5: Operation commander subsection
- Systems Manual v0.6.0 SS 6.4: CorpsOperation fields, name pool reference
- CONSOLIDATED_IMPLEMENTED.md: Updated entry
- docs/40_reports/README.md: Updated link
- REPO_MAP.md: operation_names.ts entry updated
- PROJECT_LEDGER.md: Entry added
