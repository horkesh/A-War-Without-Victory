## 7. Core Systems & Determinism

### Grade

**B+** — Strong invariants, enforced serialization and ordering; minor gaps in test coverage and one tooling locale-dependency.

Core systems and determinism are in good shape: Engine Invariants v0.6 are reflected in code, `strictCompare` and `stableStringify` are used consistently in sim and harness, serialization denylist and Map/Set rejection are enforced, and the formation location-in-control invariant is wired in three places (pipeline step, scenario runner, validation before serialize). The grade is not A because: (1) war-phase pipeline step order is not unit-tested (only the legacy `runOneTurn` phase list is); (2) DETERMINISM_TEST_MATRIX notes “no Map/Set in GameState” is covered by the serializer only, not a dedicated test; (3) `tools/engineering/determinism_guard.ts` uses `localeCompare` for string sort, which conflicts with Engine Invariants §11.3 (strictCompare for stable ordering).

---

### What works well

1. **Invariant enforcement** — Formation location-in-control is enforced by pipeline step `displace-enemy-territory`, scenario-runner initial displacement after backfill, and `validateBrigadeLocationControl` in `validateState()`; `serializeState()` always runs `validateState()` before `serializeGameState()`. Denylist in `validateGameStateShape` blocks derived-state keys at top level; `serializeGameState.ts` rejects Map/Set in the state tree (fail-fast with Engine Invariants §13.1 message).
2. **Stable ordering** — Combat, corps, and movement code consistently use `strictCompare` for sorting (e.g. `attack_resolution_osid.ts`, `corps_front_sectors.ts`, `bot_corps_directives.ts`, `displacement_takeover.ts`). Object keys in serialization are sorted with `strictCompare`; scenario runner and baseline tools use `stableStringify` for all emitted JSON.
3. **Serialization contract** — `serializeGameState` uses deterministic deep key ordering, allowlist `GAMESTATE_TOP_LEVEL_KEYS`, shape validation before serialize, and explicit Map/Set rejection. No timestamps in state or in the serializer.
4. **Pipeline step ordering** — War-phase steps are defined in a fixed array in `war_phases.ts`; `osid-column-movement` precedes `apply-brigade-movement` per Engine Invariants §14.9; `displace-enemy-territory` runs after `update-sector-offensive-results`. Order is enforced by code structure, not by a separate ordering config.
5. **Determinism gates** — DETERMINISM_TEST_MATRIX gates are in place: static scan (`determinism_static_scan_r1_5.test.ts`), scenario determinism (`scenario_determinism_h1_1`, `scenario_bots_determinism_h2_4`), turn pipeline order test, phase_e pressure determinism, sandbox slice ordering, and baseline regression (`run_baseline_regression.ts`) for byte-identical reruns.

---

### What needs improvement

1. **Nondeterminism / ordering risks** — Map/Set are used only as local variables in sim (e.g. adjacency maps, BFS sets); they are never stored on GameState. If any Map/Set were ever assigned to state, serialize would throw; there is no dedicated test that asserts “GameState has no Map/Set” at type or runtime beyond the serialize path. Internal step objects (e.g. pressure_deltas, local_supply) built from `Object.entries()` could theoretically vary key order if constructed inconsistently (DETERMINISM_AUDIT low-risk note).
2. **Invariant and pipeline test coverage** — Formation location-in-control is enforced in code and docs but has no dedicated unit test that asserts the invariant after attack resolution or displacement. War-phase step order (e.g. osid-column-movement before apply-brigade-movement, displace-enemy-territory after update-sector-offensive-results) is not asserted by a test; only the legacy `runOneTurn` phase list is tested in `turn_pipeline_order.test.ts`.
3. **Ordering edge cases** — `serialize.ts` migration uses `localeCompare` for faction and corridor sorting in a few places; Engine Invariants prefer strictCompare for reproducibility. `tools/engineering/determinism_guard.ts` uses `localeCompare` in `ensureStableSort` for string keys — acceptable for tool-only artifacts but inconsistent with canon.
4. **Schema drift** — New top-level keys must be added to `GAMESTATE_TOP_LEVEL_KEYS` and denylist kept in sync; there is no automated check that GameState type and allowlist/denylist stay aligned, so schema drift could introduce a key that is serialized or denylist-missed.
5. **Timestamp leakage** — DETERMINISM_AUDIT identified `tools/map/report_hull_inflation.ts` writing timestamps to artifacts; if that path is still present, it remains a state-affecting exception to “no timestamps in derived artifacts.”

---

### Interoperability

**(a) State / architecture**  
Serialization is the single gate for persisted state: `serializeState()` → `validateState()` → `serializeGameState()`. All state that reaches disk or IPC goes through this path, so invariants (including formation location-in-control and no derived state) are enforced at write time. GameState is defined as plain objects and arrays; Map/Set appear only in function-local variables in sim/scenario code, so the “no Map/Set in canonical state” contract is satisfied and enforced at serialize. State types and allowlist live in `game_state.ts`, `serializeGameState.ts`, and `validateGameState.ts`; changes to shape require updates there and in PIPELINE_ENTRYPOINTS / REPO_MAP when crossing canon boundaries.

**(b) Scenario runner and baselines**  
Scenario runner uses `stableStringify` for all written JSON (run_meta, reports, run_summary, control deltas, etc.). Baseline regression (`run_baseline_regression.ts`) and scenario determinism tests rely on byte-identical reruns from identical inputs; deterministic key ordering in both state serialization and harness output is required. Run IDs are derived from scenario content hash (no timestamps). Formation location-in-control is established before first serialize via `displaceFormationsInEnemyTerritory` after backfill when operational data and edges are present.

**(c) Combat / sim**  
Combat and sim modules use `strictCompare` for all ordering that affects outputs (formation IDs, OSIDs, sector IDs, attack ordering). Pipeline steps in `war_phases.ts` run in a fixed order; combat resolution, displacement, and movement steps are sequenced so that column movement runs before brigade movement and displacement runs after attack resolution. No randomness in combat logic; no timestamps in state or in combat reports.

---

### Recommendations

1. **Add an explicit determinism test for war-phase step order** — In a test that runs the real war-phase pipeline (e.g. from `runTurn` or the phase array in `war_phases.ts`), assert that `osid-column-movement` appears before `apply-brigade-movement` and that `displace-enemy-territory` appears after `update-sector-offensive-results`. Optionally add a test that builds a minimal GameState and calls `toSerializableGameState` after attaching a Map or Set somewhere and expects a throw (no Map/Set in state).
2. **Align all ordering with strictCompare** — Replace `localeCompare` in `tools/engineering/determinism_guard.ts` (e.g. in `ensureStableSort`) with a strictCompare-style comparator for string keys so tooling matches Engine Invariants §11.3. Audit `serialize.ts` migration for any remaining `localeCompare` and, where the result is part of persisted or compared output, switch to `strictCompare`.
3. **Document and, if needed, fix timestamp leakage** — Confirm whether `tools/map/report_hull_inflation.ts` still writes timestamps to artifacts; if yes, remove or replace with a deterministic identifier (e.g. input hash). Ensure any other artifact-producing tools use `stripTimestampKeysForArtifacts` or equivalent before writing under `data/derived/` or run outputs.
