# Scenario Data Contract

**Purpose:** Define what the engine currently uses for scenarios vs what the knowledge docs provide, and the options for testing historical scenarios by date.

---

## What the engine currently uses

- **Initial political control:** When a scenario does **not** specify `init_control`, the engine uses the default: `data/source/settlements_initial_master.json` (settlement-level) or the single municipality file as before. When a scenario specifies **`init_control`** (Option A): a string key (e.g. `apr1992`) or path to a **mun1990-only** control file. Resolution: key → `data/source/municipalities_1990_initial_political_controllers_<key>.json`; path-like → resolve against repo root. File schema: `{ "controllers_by_mun1990_id": { "<mun1990_id>": "RBiH" | "RS" | "HRHB" | null } }`. The harness passes the resolved path to `prepareNewGameState`; `initializePoliticalControllers` detects mun1990-only format (has `controllers_by_mun1990_id`, no `settlements` array) and applies municipality→settlement inheritance. All 110 mun1990_ids must be present.
- **Initial formations (Option A):** When a scenario specifies **`init_formations`** (string key e.g. `apr1992` or path), the harness resolves key → `data/scenarios/initial_formations/initial_formations_<key>.json`, loads the asset (schema: array or `{ formations: [...] }` with `id`, `faction`, `name`; optional `kind`, `assignment`, `status`, `created_turn`), and merges into `state.formations` after `prepareNewGameState` and before the first turn. Deterministic order (by id).
- **Scenario JSON** (e.g. in `data/scenarios/`): Defines `scenario_id`, `weeks`, `turns` (each turn: `week_index` + `actions`: noop, note, probe_intent, baseline_ops), and optionally **`init_control`** and **`init_formations`** as above. The scenario runner builds initial state via `createInitialGameState(seed, controlPath)` and, when `init_formations` is set, loads and merges formations; then runs N weeks with the given actions.
- **sim_scenario CLI** (`src/cli/sim_scenario.ts`): A different pipeline — loads a **save file** (full serialized GameState) plus a **script file** (schema 1: posture updates per turn by `edge_id`). Scenario-specific initial state can also be achieved via the harness with `init_control` / `init_formations` as above.

---

## What the knowledge docs provide

- **Eight scenario dates** (April 1992, December 1992, March 1993, December 1993, February 1994, November 1994, July 1995, October 1995) with narrative context, key control examples, and validation anchors.
- **Settlement/municipality-level control** for each scenario (who holds which town or municipality at that date).
- **Validation anchors** expressed in game terms where possible: e.g. `controllers_by_mun1990_id['xv'] === 'RS'`, or “all settlements in Sapna area have `political_controller === 'RBiH'`” when per-settlement or scenario-specific data exists. See `SCENARIOS_EXECUTIVE_SUMMARY.md`, `SCENARIO_01_APRIL_1992.md`, `SCENARIOS_02-08_CONSOLIDATED.md`, and `SCENARIO_GAME_MAPPING.md`.

---

## Testing historical scenarios by date

To test “actual game systems” against a specific scenario date (e.g. April 1992), one of the following is required:

- **Option A:** One initial control file **per scenario date** (e.g. `municipalities_1990_initial_political_controllers_apr1992.json`), with the same schema as the current file, plus **harness or CLI support** to select that file when running that scenario (e.g. scenario JSON specifies an init file path, or a wrapper script passes a mapping path to `prepareNewGameState` / a one-off that writes a save from that mapping).
- **Option B:** Keep the **single** initial control snapshot and treat scenario JSONs as “same init, different run length and actions” (current behaviour). Historical accuracy per date is not testable; only behaviour from the single snapshot is.

- **Option A (implemented):** Scenario JSON can specify `init_control` (e.g. "apr1992") so the harness uses the corresponding mun1990-only control file; and `init_formations` (e.g. "apr1992") so the harness loads and merges initial formations from data/scenarios/initial_formations/. Well-known keys: apr1992, apr1995, dec1992, mar1993, dec1993, feb1994, nov1994, jul1995, oct1995.
- **Option B:** Omit init_control and init_formations; the runner uses the default initial control and no initial formations.
