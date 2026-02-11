# Scenario–Game Systems Mapping

**Purpose:** Single source of truth for mapping between scenario/knowledge documents and AWWV game systems. Used by scenario docs, OOB masters, and validation.

---

## Faction IDs

| Historic / narrative | Game (engine) |
|----------------------|---------------|
| ARBiH (Army of the Republic of Bosnia and Herzegovina) | `RBiH` |
| VRS (Vojska Republike Srpske) | `RS` |
| HVO (Croatian Defense Council) | `HRHB` |

All political control and faction references in game state use these three IDs.

---

## Political control values

Allowed values for settlement/municipality controller in the engine:

- `RBiH`
- `RS`
- `HRHB`
- `null` (no controller; rare, explicitly justified)

Same set is used in `data/source/municipalities_1990_initial_political_controllers.json` and in `GameState.political_controllers`.

---

## Municipality IDs (mun1990_id)

- The game uses **1990 municipality boundaries**. Each municipality has a stable **mun1990_id** (lowercase, underscores; e.g. `zvornik`, `brcko`, `srebrenica`).
- **Registry:** `data/source/municipalities_1990_registry_110.json` — lists all 110 mun1990_ids with `name` and `normalized_name`. Use this to map place names in scenario docs to mun1990_id.
- **Initial control:** `data/source/municipalities_1990_initial_political_controllers.json` — keys are mun1990_id, values are `RBiH` | `RS` | `HRHB` | `null`. Settlements inherit controller from their municipality (via `settlements_index_1990` / settlement graph).

### Post-1995 municipalities (Sapna, Teočak, etc.)

Some scenario locations (e.g. **Sapna**, **Teočak**) are post-1995 municipalities. In 1990 they belonged to larger units:

- **Sapna** (post-1995) → part of **Zvornik** (mun1990_id: `zvornik`) in 1990.
- **Teočak** (post-1995) → part of **Ugljevik** (mun1990_id: `ugljevik`) in 1990.

For validation anchors that say “Sapna holds as RBiH stronghold”: the engine currently only has municipality-level control (one value per mun1990_id). So `zvornik` has a single controller for the whole municipality; it cannot represent “Sapna held, rest of Zvornik VRS” without per-settlement or scenario-specific data. Document this as the intended assertion so that when per-scenario or settlement-level data exists, tests can be written (e.g. by settlement ID or future sub-municipality mapping).

---

## Formation / OOB

- Corps, brigades, and strength figures in the OOB masters (ARBiH, HVO, VRS) are the **reference** for naming and structure. **Initial formations (Option A):** The harness can load scenario-specific initial formations when the scenario specifies init_formations (e.g. apr1992); merged into GameState.formations at run start. OOB masters remain the source for authoring (initial load only; runtime spawn remains directive-driven).
- The game’s formation system is now partially populated from OOB via init_formations assets (see above).

---

## References

- Game state types: `src/state/game_state.ts`
- Political control init: `src/state/political_control_init.ts`
- Scenario loader: `src/scenario/scenario_loader.ts`, `src/scenario/scenario_types.ts`
- Scenario runner: `src/scenario/scenario_runner.ts`
