# Actual turn-16 normalization diagnosis

**Verdict:** the warm capture proves a production serialization invariant defect. Live fatigue production writes half-point values, but the serializer forces the state through the version-9 migration, whose integer-only guard resets every fractional `formation.ops.fatigue` to zero. Electron commits that normalized runtime JSON between Advances; the headless scenario loop carries the in-memory `nextState` forward without replacing it with serialized state.

This establishes a real native/headless boundary and a commander-fitness operand change. It does **not** establish that the week-17 candidate rank or selected brigade changed, and it does not yet prove causation for the 705 score or the two missing cells.

## Relevant formations

| Formation | Raw → normalized change | Diagnostic offense | Diagnostic defense | Tier |
|---|---:|---:|---:|---|
| Foča (`rs_foa_brigade`) | fatigue `10.5 → 0` | `0.0904204 → 0.10514` | `0.075217156 → 0.08242976` | garrison → garrison |
| Gacko (`rs_gacko_brigade`) | fatigue `2.5 → 0` | `0.1110371333 → 0.114866` | `0.0773813953 → 0.079027808` | garrison → garrison |
| Nevesinje | no change; fatigue `4` | unchanged | unchanged | unchanged |
| Čajniče (`rs_ajnie_brigade`) | no change; fatigue `8` | unchanged | unchanged | unchanged |

Personnel, cohesion, morale, readiness, kind, activation fields, location, and the other captured commander fields are unchanged for all four. The diagnostic used null zone and unknown supply by design. Among these four its offense order remains Gacko, Foča, Nevesinje, Čajniče before and after normalization. Actual week-17 eligibility, supply, zone, complete candidate pool, rank, and selection were not observed.

## Production boundary

- `src/state/formation_fatigue.ts:254-260,303-334` deliberately adds and persists `0.5` frontline fatigue.
- `src/state/serialize.ts:13-37` sends both canonical and runtime serialization through `migrateState({ ...state, schema_version: 0 })`.
- `src/state/save_migration.ts:186-215,469-475` reruns version-9 `defaultFormations`; line 207 resets every non-integer fatigue to zero. Git history places this guard in `143ce96556`, after the half-point producer in `6f3c186824`.
- `src/sim/combat/commander/force_eval.ts:76-81,92-124` consumes the real number directly in offense and defense fitness.
- `src/desktop/electron-main.cjs:420-456,2389-2425` serializes state after Advance and deserializes that runtime JSON before the next Advance.
- `src/scenario/scenario_runner.ts:2881-2891,2952-2983` carries `runResult.nextState` directly into the next headless week; serialization at `3422-3468` emits artifacts without replacing live state.

The capture found 25 fractional-fatigue reset paths overall. Runtime and canonical byte equality *after* round trip proves only that the already-normalized state is idempotent. It does not prove fidelity to the raw in-memory state.

This is not legitimate derived-state normalization. `ops.fatigue` is persisted formation truth read by combat and commander systems. Engine Invariants §11.4 (`Engine_Invariants_v0_9_0.md:295-301`) requires save/load to reconstruct formation state; §11.5 requires the desktop mutation to become durable through serialization (`303-305`).

The persistence classification is explicit in production structure and repository checks: `FormationState` owns `ops` (`game_state.ts:1224-1243`); canonical serialization strips exactly five named derived military projections and neither `formations` nor `ops` is among them (`serializeGameState.ts:32-50`); and the consumer manifest calls `formation.ops.fatigue` persisted (`collapse_consumer_manifest.test.ts:59-63`). The `integer >= 0` inline comment at `game_state.ts:1225` conflicts with the later live `0.5` writer. It is a stale contract annotation, not evidence that fractional fatigue is deprecated or intended to be neutralized.

## Cohesion and morale defaults

No named RS formation received a cohesion or morale default, and no cohesion default occurred anywhere in the capture. Two unrelated RBiH formations (`arbih_351st_liberation`, `arbih_373rd_slavna_mountain`) gained missing morale `60`. Their constructor omits morale when `initial_morale` is absent (`oob_early_war_entry.ts:331-364`); version-9 `defaultFormations` owns the later default (`save_migration.ts:214-216`). This does not support the rejected Foča cohesion/morale hypothesis.

## Smallest grounded repair

Preserve any finite, non-negative fatigue in `defaultFormations`; default only missing, non-number, non-finite, or negative values to zero. Align the stale integer-only contract in `game_state.ts:1224-1227` and `validate/formations.ts:318-337`. Do not round, rescale, or change the `0.5` producer, recovery cadence, commander thresholds, cohesion, morale, terrain, or operation logic.

Focused RED/GREEN tests should require exact `10.5` and `2.5` preservation through both canonical and runtime serialize/deserialize paths, exercise the real half-point producer, retain malformed legacy fallback, and prove integer inputs stay byte-stable. Integer-only reporting guards and the legacy region/edge commitment guard need separate bounded review because changing them is broader than this proved persistence seam.

After review and the focused fix, run one observer-backed 0→16 preservation prefix. Require the 25 fractional-fatigue reset paths to disappear, the four named values to match raw state, and no unrelated gameplay/control/report drift. The canonical turn-16 hash must change because the old hash contains lossy zeroes; decoded old/new save differences must be confined to authorized fatigue preservation and directly derived hash metadata. Stop before week 17.

Evidence: `warm-capture-02/diagnostic.json` SHA-256 `4ace77267dc108e95a39f1f3f1982bb63a5b4535f8e80030e7c7f057d08e11f5`; `result.json` SHA-256 `b0693b42638ad890318a39d2541f9fd32746892308e0d671cad3e8dbc1b16137`; receipt child/wrapper `0/0`, artifact contract passed.
