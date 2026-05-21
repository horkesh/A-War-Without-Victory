# Strict-Null Batch C Schema-Boundary Validation Plan

> **Status:** Batch C is implementation-closed as of 2026-05-21. This document remains the design/verification contract for the closed schema-boundary lane and the precedent for future schema-validation work.

**Goal:** Define the contract for converting the 52 `as_unknown_casts` distributed across 12 schema-boundary files into typed `parse<X>(raw: unknown): X | null` helpers with explicit fallback semantics, so the Strict-Null migration can close its third batch class (`schema-boundary`) without changing runtime behavior on valid input or hiding behavior bugs behind silent default coercions.

**Architecture:** This lane covers JSON ingestion seams, IPC state-shape reads, and replay-frame schema reads where the current code uses `JSON.parse(...) as unknown` followed by a downstream `as` narrowing. Each site is at a boundary between an untyped payload (file, IPC, LLM, replay sidecar) and a typed engine consumer. The plan introduces a shared validator module (`src/state/schema_validators.ts`) and per-loader `parse<X>` helpers, then routes each loader through them in a follow-up implementation lane.

**Tech Stack:** TypeScript strict mode, `tools/diagnostics/strict_null_inventory.cjs`, `tests/strict_null_inventory_progress.test.ts`, Vitest, scenario baseline gates for sim-facing files, `npm.cmd run desktop:map:build` for IPC/Electron-bridge files.

---

## Status

This document was originally authored as the contract and validation gates for Batch C. As of 2026-05-21, Batch C0-C12 consumed it completely: `src/state/schema_validators.ts` is live, all twelve plan-scoped files are pinned at zero `as_unknown_casts`, and the predicted full-Batch-C floor of 28 was reached. Two follow-on tail passes then reduced the repo-wide `as_unknown_casts` floor further to 6.

## Inventory Baseline — Post Batch 50/51

Top-level inventory after Batch 50 (UI-only trivial alias / JSX truthy-narrowing closeout) and Batch 51 (sim runtime-invariant cleanup, Batch B closeout):

| Category | Baseline 2026-05-17 | Post Batch 49 | Post Batch 50 | Post Batch 51 | Δ since baseline |
|---|---:|---:|---:|---:|---:|
| `as_factionid_casts` | 154 | 2 | 2 | **2** | −152 |
| `as_unknown_casts` | 97 | 80 | 80 | **80** | −17 |
| `as_any_casts` | 395 | 319 | 319 | **319** | −76 |
| `non_null_assertions_dot` | 50 | 39 | 32 | **11** | −39 |
| `non_null_assertions_index` | 59 | 43 | 38 | **38** | −21 |
| `optional_fields_game_state` | 458 | 463 | 463 | **463** | +5 |

The current post-tail / validator / UI-builder / bot-response floor is `2 / 6 / 217 / 11 / 38 / 463` (`as_factionid_casts / as_unknown_casts / as_any_casts / non_null_assertions_dot / non_null_assertions_index / optional_fields_game_state`).

Both Batch A (UI-only) and Batch B (sim runtime-invariant) are closed. Batch C (this plan) targets `as_unknown_casts`, which has held flat at 80 across Batches 49 → 50 → 51. Of those 80 sites, 52 cluster in 12 schema-boundary files; the remaining 28 sit in singleton files documented in `docs/40_reports/audits/20260520_STRICT_NULL_POST_FACTIONID_CLASSIFICATION.md` §3.

## Out Of Scope

- No source-file edits to any of the 12 files in this packet. Edits land in the follow-up implementation lane.
- No save-shape changes; loaders may **reject** an invalid payload but must not **promote** an optional field to required.
- No `GameStateAdapter.ts` edits (Phase 5 chokepoint; touched once in Batch 48; covered separately by the UI/engine `FactionId` unification lane).
- No `save_migration.ts` changes (separate save-schema lane). Schema validators here are read-side; the migration path stays in its own lane.
- No `validateGameState.ts` invariant tightening that would reject a previously-accepted save. Validators may add typed narrowing; they may not promote optional fields.
- No changes to `FORAWWV.md`, the Engine Invariants doc, or the Systems Manual. Helpers are TS-only contracts.
- No new scenario fields, new save schema version bump, new IPC channels, new LLM contract.

## Stop Gates

- **Stop if** any `parse<X>` helper changes runtime semantics for **valid** input (i.e. semantically valid payloads on the live serialization path produce a different result after the helper).
- **Stop if** the helper would require a new optional-field promotion in `GameState` — that belongs to the save-shape lane.
- **Stop if** a touched file is in another active multi-agent edit lane (check `git status` and recent ledger entries before starting any implementation batch).
- **Stop if** `npm.cmd run test:baselines` would change byte-identity for any sim-path file (`scenario_loader.ts`, `war_timeline.ts`, `political_control_init.ts`, `oob_loader.ts`, `brigade_temporal_emit.ts`, `collect_briefing.ts`, `serialize.ts`, `validateGameState.ts`, `sector_offensive_launch_helpers.ts`).
- **Stop if** any helper hides an existing behavior bug (e.g. silently coerces a `number` LLM response to a string). Document and route to a separate behavior-fix lane.

---

## 1. Files In Scope (12)

| # | File | `as_unknown_casts` | Sim-path | Baseline gate | Build gate |
|---:|---|---:|:---:|:---:|:---:|
| 1 | `src/scenario/scenario_loader.ts` | 8 | ✔ | ✔ | — |
| 2 | `src/state/war_timeline.ts` | 8 | ✔ | ✔ | — |
| 3 | `src/state/political_control_init.ts` | 7 | ✔ | ✔ | — |
| 4 | `src/scenario/oob_loader.ts` | 6 | ✔ | ✔ | — |
| 5 | `src/scenario/brigade_temporal_emit.ts` | 5 | ✔ | ✔ | — |
| 6 | `src/sim/briefing/collect_briefing.ts` | 4 | ✔ | ✔ | — |
| 7 | `src/desktop/desktop_sim.ts` | 3 | partial | partial | ✔ (Electron) |
| 8 | `src/state/serialize.ts` | 3 | ✔ | ✔ | — |
| 9 | `src/state/validateGameState.ts` | 2 | ✔ | ✔ | — |
| 10 | `src/sim/replay/replay_frame_summary.ts` | 2 | ✔ | ✔ | — |
| 11 | `src/sim/ai_commander/war_dispatches.ts` | 2 | ✔ | ✔ | — |
| 12 | `src/sim/combat/sector_offensive_launch_helpers.ts` | 2 | ✔ | ✔ | — |

**Total:** 52 of the 80 inventory-counted `as_unknown_casts`. The remaining 28 cluster in `src/data/*`, `src/map/*`, `src/scenario/scenario_runner.ts`, `src/scenario/campaign_unlock.ts`, `src/scenario/initial_formations_loader.ts`, `src/ui/warroom/warroom.ts`, and `src/cli/sim_scenario.ts` — out of scope for this packet because they either (a) ride the same JSON-ingestion pattern as `scenario_loader.ts` and will be picked up by the helper module after the 12 named files prove the contract, or (b) are CLI / warroom-bridge sites covered by separate lanes.

---

## 2. The Six Validator Helper Contracts

The implementation lane introduces a new module `src/state/schema_validators.ts` exposing six generic narrowing primitives plus per-loader composed helpers. The primitives are:

```ts
// src/state/schema_validators.ts

/** Narrow `unknown` to `Record<string, unknown>`. Returns `null` if not a plain object. */
export function asRecord(value: unknown): Record<string, unknown> | null;

/** Narrow `unknown` to `unknown[]`. Returns `null` if not an array. */
export function asArray(value: unknown): unknown[] | null;

/** Narrow `unknown` to `string`. Returns `null` if not a string. */
export function asString(value: unknown): string | null;

/** Narrow `unknown` to a finite `number`. Returns `null` for non-numeric, NaN, Infinity. */
export function asFiniteNumber(value: unknown): number | null;

/** Narrow `unknown` to `boolean`. Returns `null` if not a boolean. */
export function asBoolean(value: unknown): boolean | null;

/** Narrow `unknown[]` (already array-checked) to `T[]`, dropping items that fail `parseItem`. */
export function asTypedArray<T>(
    items: readonly unknown[],
    parseItem: (raw: unknown) => T | null,
): T[];
```

Reference precedent: the Batch 49 `parseFactionId(...)` and `parseAdvisorContextType(...)` helpers in `src/sim/ai_commander/response_parser.ts` (commit `9f78a37b`) are the prototype — they live alongside their consumer because they are LLM-response-specific. The Batch C plan generalizes the pattern into a shared module so that loader callers don't each re-invent `typeof === 'string'` chains.

### 2.1 Per-loader composed helpers

Each of the 12 files gets one or more per-loader composed helpers built on the primitives above. Naming convention: `parse<ShapeName>(raw: unknown): ShapeName | null`. Located **co-located with the loader**, not in the shared module, so the loader and its parsers ship together and per-file fallback semantics stay readable.

| File | Composed helpers (proposed) |
|---|---|
| `scenario_loader.ts` | `parseStringArray(raw)`, `parseScenarioMetadata(raw)`, `parseInitFormationsBlock(raw)` |
| `war_timeline.ts` | `parseEquipmentDecayArray(raw)`, `parseWarTimelineEntry(raw)`, `parseSiegeProgressMap(raw)` |
| `political_control_init.ts` | `parsePoliticalControlPayload(raw)`, `parseInitialControlBlock(raw)`, `parseReferendumBlock(raw)` |
| `oob_loader.ts` | `parseCorpsRecord(raw)`, `parseFormationRecord(raw)`, `parseBrigadeComposition(raw)` |
| `brigade_temporal_emit.ts` | `parseCorpsCommandPath(raw)`, `parseBrigadeTemporalRecord(raw)` |
| `collect_briefing.ts` | `parseCorpsCommandShape(raw)`, `parseOptionalEnclaveResilience(raw)` |
| `desktop_sim.ts` | `parseControlEvents(raw)`, `parseOptionalMilitaryField(raw, key)` |
| `serialize.ts` | `parseSerializedGameStateShell(raw)` |
| `validateGameState.ts` | `parseTopLevelArrayCount(raw)` |
| `replay_frame_summary.ts` | `parseReplayFrameMilitary(raw)` |
| `war_dispatches.ts` | `parseOptionalEnclaveState(raw)` |
| `sector_offensive_launch_helpers.ts` | `parseOperationalReverseMap(raw)` (or alternative: signature loosen to accept `undefined`; see §6) |

---

## 3. Per-File Analysis

Each entry below lists: site pattern, current behavior, parse-helper contract, fallback semantics, byte-identity gate, and follow-up test.

### 3.1 `src/scenario/scenario_loader.ts` (8 sites)

**Current pattern:** `(raw as unknown[]).filter((x): x is string => typeof x === 'string')` post-`JSON.parse(content) as unknown`, plus `(JSON.parse(content) as unknown) as ScenarioMetadata` widening on the metadata side.

**Helper contract:**
- `parseStringArray(raw: unknown): string[]` — uses `asArray` + filter; returns `[]` for non-array or all-non-string input.
- `parseScenarioMetadata(raw: unknown): ScenarioMetadata | null` — uses `asRecord` + per-field narrowing chain; returns `null` for unrecoverably malformed scenario JSON. Loader must then throw or fall through to existing error path (already present in the loader).

**Fallback semantics:** Bare `parseStringArray` returns `[]` (preserves the current `.filter(...)` behavior of silently dropping non-strings). `parseScenarioMetadata` returns `null` — loader path **must** then propagate the same error message it currently emits when the cast is wrong (today: a downstream property-access TypeError at scenario init). Helper does **not** silence the failure; loader keeps its existing throw.

**Byte-identity gate:** `npm.cmd run test:baselines` MUST pass byte-identically on all four baseline scenarios after implementation. `parseStringArray` is byte-identical by construction; `parseScenarioMetadata` is byte-identical because the existing `as` cast already crashes on malformed metadata.

**Follow-up tests:**
- `tests/strict_null_inventory_progress.test.ts` — add `BATCH_C_SCENARIO_LOADER_FILES` slice assertion (`as_unknown_casts`: 8 → 0 for this file).
- `tests/scenario_loader_schema_boundary.test.ts` (new) — fixture-driven: valid scenario JSON, mismatched-shape JSON (expects helper returns `null`, loader throws same message), array-of-non-string fixture (expects `parseStringArray` returns `[]`).

### 3.2 `src/state/war_timeline.ts` (8 sites)

**Current pattern:** `(obj.equipment_decay as unknown[]).length` etc. over loaded state arrays; `(timeline as unknown as WarTimeline)` cast.

**Helper contract:**
- `parseEquipmentDecayArray(raw: unknown): EquipmentDecayEntry[]` — uses `asArray` + `asTypedArray<EquipmentDecayEntry>`.
- `parseWarTimelineEntry(raw: unknown): WarTimelineEntry | null` — uses `asRecord` + per-field narrowing.
- `parseSiegeProgressMap(raw: unknown): Record<string, number>` — uses `asRecord` + `asFiniteNumber` per value.

**Fallback semantics:** All three helpers return empty / `null` on malformed input. The current code uses `.length` on the cast value; the helper preserves this by returning `[]` (length 0) for non-array input, matching the runtime behavior of `(x as unknown[]).length` on an actual array. For non-array input the current `(x as unknown[]).length` throws — the helper changes this to "return 0," which is **technically a runtime change** but only on input shapes that today would have crashed before reaching the helper. Document in the implementation report. Add a fixture test confirming valid input is byte-identical.

**Byte-identity gate:** `npm.cmd run test:baselines` MUST pass byte-identically.

**Follow-up tests:**
- Same inventory progress assertion.
- `tests/war_timeline_schema_boundary.test.ts` — fixture: equipment decay with mixed-type entries, missing siege progress, present-but-malformed siege progress.

### 3.3 `src/state/political_control_init.ts` (7 sites)

**Current pattern:** `JSON.parse(content) as unknown` followed by `(controlData as unknown) as Record<string, PoliticalControlEntry>` widening; also `(referendum as unknown) as ReferendumData` casts.

**Helper contract:**
- `parsePoliticalControlPayload(raw: unknown): Record<string, PoliticalControlEntry>` — uses `asRecord` + entry narrowing.
- `parseInitialControlBlock(raw: unknown): InitialControlBlock | null`.
- `parseReferendumBlock(raw: unknown): ReferendumData | null`.

**Fallback semantics:** Same as `scenario_loader.ts` — `null` propagates up; loader **must** throw with the same error message it does today when the cast fails downstream.

**Byte-identity gate:** `npm.cmd run test:baselines` MUST pass byte-identically. Political control init runs at scenario start; mismatch would shift turn 0 control snapshot.

**Follow-up tests:**
- Inventory progress assertion.
- `tests/political_control_init_schema_boundary.test.ts` — fixtures for valid census file, malformed entry (expects same throw path), partial entry (expects helper-level null then loader throw with the existing message).

### 3.4 `src/scenario/oob_loader.ts` (6 sites)

**Current pattern:** `JSON.parse(content) as unknown` + downstream `(corps as unknown[]).filter(...)` + `r.composition as unknown as BrigadeComposition`.

**Helper contract:**
- `parseCorpsRecord(raw: unknown): CorpsRecord | null`.
- `parseFormationRecord(raw: unknown): FormationRecord | null`.
- `parseBrigadeComposition(raw: unknown): BrigadeComposition | null`.

**Fallback semantics:** Per record: malformed entry returns `null` and is filtered out (matches current `.filter((x): x is CorpsRecord => ...)` behavior). Top-level malformed JSON returns `null`, loader throws.

**Byte-identity gate:** `npm.cmd run test:baselines` MUST pass byte-identically. OOB load is on the scenario hot path; any drop in formation count would shift `apr1992_52w` hashes.

**Follow-up tests:**
- Inventory progress assertion.
- `tests/oob_loader_schema_boundary.test.ts` — fixtures: valid OOB, one malformed brigade composition, missing faction field (expects helper-level filter, no count change vs current `.filter((x): x is ...)` path).

### 3.5 `src/scenario/brigade_temporal_emit.ts` (5 sites)

**Current pattern:** `(state as unknown as { military: { corps_command?: ... } })` engine-state-shape widening — this is **cross-engine save-shape** territory.

**Helper contract:**
- `parseCorpsCommandPath(raw: unknown): CorpsCommandPath | null`.
- `parseBrigadeTemporalRecord(raw: unknown): BrigadeTemporalRecord | null`.

**Fallback semantics:** Returns `null` for unrecognized engine-state shape. **Caller behavior MUST stay the same:** today the `as unknown as { ... }` cast unconditionally widens — the helper returns `null`, and the consumer treats `null` as "no temporal emit on this path." This MUST be confirmed by a fixture test before the cast is removed, because if any baseline scenario currently passes through this widening with an unrecognized shape, the helper would change behavior.

**Byte-identity gate:** `npm.cmd run test:baselines` MUST pass byte-identically. **Higher risk** than the other 11 files — engine-state-shape reads can silently shift if the new fallback path differs from the prior cast-and-pray path.

**Follow-up tests:**
- Inventory progress assertion.
- `tests/brigade_temporal_emit_schema_boundary.test.ts` — fixtures: full engine state with `corps_command`, engine state without `corps_command` (expects same `null` / skip path as today), engine state with malformed `corps_command` (expects null + skip).
- Defensive: a 4w fixture run that confirms the brigade-temporal-emit count is identical pre/post.

### 3.6 `src/sim/briefing/collect_briefing.ts` (4 sites)

**Current pattern:** `(cc as unknown as Record<string, unknown>)['faction']` runtime field access bypassing typed `corps_command` shape; reads optional `enclave_resilience` not on `MilitaryState` interface.

**Helper contract:**
- `parseCorpsCommandShape(raw: unknown): { faction?: FactionId; corps_id?: string; ... } | null`.
- `parseOptionalEnclaveResilience(raw: unknown): Record<string, number> | null`.

**Fallback semantics:** Today's read returns `undefined` on missing field via `(cc as unknown as Record<string, unknown>)['faction']`. Helper returns the same shape: `{ faction: undefined, ... }` when the field is missing. Helper must **not** require either field — both are optional reads inside briefing assembly.

**Byte-identity gate:** `npm.cmd run test:baselines` MUST pass byte-identically. Briefing is consumed by save serialization on every turn.

**Follow-up tests:**
- Inventory progress assertion.
- `tests/collect_briefing_schema_boundary.test.ts` — fixtures: corps with full command shape, corps missing faction (expects `undefined` propagated), corps with extra fields (expects helper drops them silently).

### 3.7 `src/desktop/desktop_sim.ts` (3 sites)

**Current pattern:** `(state as unknown as { military: { control_events?: unknown[] } })` IPC-boundary optional field access on outbound state.

**Helper contract:**
- `parseControlEvents(raw: unknown): ControlEvent[] | undefined`.
- `parseOptionalMilitaryField<K extends keyof MilitaryState>(raw: unknown, key: K): MilitaryState[K] | undefined`.

**Fallback semantics:** Returns `undefined` for missing or malformed values. **Must NOT** return `[]` for missing `control_events` — the current cast surfaces `undefined` when the field is absent, and downstream IPC consumers distinguish `undefined` (field absent) from `[]` (field present, empty). Document this in the helper JSDoc.

**Byte-identity gate:** Desktop tests + `npm.cmd run desktop:map:build` MUST pass. `npm.cmd run test:baselines` MUST also pass (desktop_sim participates in serialization).

**Follow-up tests:**
- Inventory progress assertion.
- `tests/desktop_sim_schema_boundary.test.ts` — fixtures: state with control_events array, state without control_events (expects `undefined`), state with malformed control_events shape (expects `undefined` + IPC drop).

### 3.8 `src/state/serialize.ts` (3 sites)

**Current pattern:** `JSON.parse(payload) as unknown` + `candidate as unknown as GameState` load boundary at deserialization entry.

**Helper contract:**
- `parseSerializedGameStateShell(raw: unknown): { kind: 'gameState'; payload: Record<string, unknown> } | null`.

**Fallback semantics:** Returns `null` on top-level shape mismatch; serializer throws the same `Failed to deserialize game state` error it currently throws when downstream property access blows up. Helper does **not** validate field-by-field — `validateGameState.ts` owns that lane.

**Byte-identity gate:** Critical. `npm.cmd run test:baselines` MUST pass byte-identically. Serialize is on the every-turn write/read path; any tightening that rejects a currently-accepted save shape breaks baselines.

**Follow-up tests:**
- Inventory progress assertion.
- `tests/serialize_schema_boundary.test.ts` — fixtures: valid serialized state, top-level non-object (expects helper null + throw), missing required fields (expects helper returns shell with missing keys, validator catches downstream as today).

### 3.9 `src/state/validateGameState.ts` (2 sites)

**Current pattern:** `(list as unknown[]).length` legacy validator iteration after a typed branch.

**Helper contract:**
- `parseTopLevelArrayCount(raw: unknown, key: string): number` — uses `asArray`; returns 0 for non-array. Validator emits its existing `validation error: <key> is not an array` message in the null branch.

**Fallback semantics:** Validator's existing diagnostic message stays unchanged. Helper returns 0 → validator throws → same message as today. No silent skip.

**Byte-identity gate:** Validator output on the load path is consulted by save migration. `npm.cmd run test:baselines` MUST pass byte-identically.

**Follow-up tests:**
- Inventory progress assertion.
- `tests/validateGameState_schema_boundary.test.ts` — already-validated saves continue to pass; malformed save still throws the same message.

### 3.10 `src/sim/replay/replay_frame_summary.ts` (2 sites)

**Current pattern:** `frame.military as unknown as Record<string, unknown> | undefined` replay-frame schema reads.

**Helper contract:**
- `parseReplayFrameMilitary(raw: unknown): Record<string, unknown> | undefined`.

**Fallback semantics:** Returns `undefined` for missing or non-object. Today's cast also propagates `undefined` for missing — but it does NOT propagate `undefined` for present-but-non-object. Helper aligns these by returning `undefined` in both cases; the present-but-non-object case currently produces a runtime TypeError downstream, so helper is **stricter at the boundary, looser downstream** — net behavior change: replay frames with malformed military sub-object no longer crash the replay reader; they silently emit a frame with no military summary. **Acceptable** because replay frames are diagnostic-only and never feed back into sim state. Document in the implementation report.

**Byte-identity gate:** `npm.cmd run test:baselines` MUST pass byte-identically (replay-frame summary is generated alongside save but doesn't shift save hashes).

**Follow-up tests:**
- Inventory progress assertion.
- `tests/replay_frame_summary_schema_boundary.test.ts` — fixtures: valid replay frame, missing military, present-but-malformed military (expects `undefined` + skipped summary).

### 3.11 `src/sim/ai_commander/war_dispatches.ts` (2 sites)

**Current pattern:** `(state.military as unknown as Record<string, unknown>).enclave_state` — optional state path not yet typed at the `MilitaryState` interface.

**Helper contract:**
- `parseOptionalEnclaveState(raw: unknown): Record<string, unknown> | undefined`.

**Fallback semantics:** Same as `desktop_sim.ts` parseOptionalMilitaryField — `undefined` for missing or non-object; downstream consumer is already tolerant of `undefined` (no enclave dispatch).

**Byte-identity gate:** AI commander dispatch is on the every-turn LLM context path. `npm.cmd run test:baselines` MUST pass byte-identically — the LLM context is part of the deterministic input record.

**Follow-up tests:**
- Inventory progress assertion.
- `tests/war_dispatches_schema_boundary.test.ts` — fixtures: military with enclave_state, military without (expects `undefined`), military with malformed enclave_state.

### 3.12 `src/sim/combat/sector_offensive_launch_helpers.ts` (2 sites)

**Current pattern:** `undefined as unknown as OperationalToCanonicalReverseMap` — placeholder for required parameter when caller does not need the reverse-map projection.

**Helper contract OR alternative:**
- **Option A (signature loosen, recommended):** Change the parameter type in `sector_offensive_launch_helpers.ts` from `OperationalToCanonicalReverseMap` to `OperationalToCanonicalReverseMap | undefined`. The two call sites that pass `undefined` drop their casts; the body adds a null guard. No `parse<X>` helper required.
- **Option B (parse helper):** `parseOperationalReverseMap(raw: unknown): OperationalToCanonicalReverseMap | null`. Both call sites pass `null`; body checks `null`. Adds noise.

**Recommended: Option A.** Strictly a TS signature-tightening lane. **Not** a runtime change; not a `parse<X>` schema-boundary site in spirit. The implementation lane folds this into the same packet for inventory hygiene but documents the difference.

**Byte-identity gate:** `npm.cmd run test:baselines` MUST pass byte-identically (Option A is type-only; runtime is unchanged).

**Follow-up tests:**
- Inventory progress assertion.
- No new fixture — existing `sector_offensive_launch_*` test coverage exercises both call paths.

---

## 4. Fallback Semantics Matrix

| Pattern | Today | After helper |
|---|---|---|
| `JSON.parse(content) as unknown` → property access on a valid payload | Property access returns expected typed value | Helper returns typed value, byte-identical |
| `JSON.parse(content) as unknown` → property access on a top-level non-object | Downstream TypeError at first property access | Helper returns `null`, caller throws same loader-error message |
| `(x as unknown[]).filter((x): x is T => ...)` over array of mixed types | Drops mismatched items silently | Helper drops same items, byte-identical |
| `(x as unknown[]).length` on a present-but-non-array value | TypeError on `.length` | Helper returns 0 — **stricter at boundary, looser downstream**; document |
| `(state as unknown as { military: { x?: ... } })` shape widening on a known-correct engine state | Returns expected nested field | Helper returns same field, byte-identical |
| `(state as unknown as { military: { x?: ... } })` shape widening on unexpected engine shape | Returns whatever the inline shape declaration says, often `undefined` | Helper returns `null`/`undefined`; consumer skip path identical to today |
| `(undefined as unknown as ParamType)` in optional-call-site signature | Type-only no-op, runtime `undefined` | Option A — signature-loosen; type-only no-op, identical runtime |

**Stricter-at-boundary cases (documented):**
- `war_timeline.ts` (`.length` on non-array)
- `replay_frame_summary.ts` (non-object military sub-object)

Neither case is reachable in any of the 4 baseline scenarios; document and ship.

---

## 5. Shared Helper Module Test Strategy

`tests/schema_validators.test.ts` (new) — unit tests for the six primitives:

- `asRecord({})` → `{}`; `asRecord(null)` → `null`; `asRecord([])` → `null`; `asRecord('a')` → `null`.
- `asArray([])` → `[]`; `asArray({length: 0})` → `null`; `asArray('a')` → `null`.
- `asString('a')` → `'a'`; `asString('')` → `''`; `asString(0)` → `null`; `asString(null)` → `null`.
- `asFiniteNumber(0)` → `0`; `asFiniteNumber(NaN)` → `null`; `asFiniteNumber(Infinity)` → `null`; `asFiniteNumber('1')` → `null`.
- `asBoolean(true)` → `true`; `asBoolean(0)` → `null`; `asBoolean(null)` → `null`.
- `asTypedArray([1, 'a', 2], (x) => typeof x === 'number' ? x : null)` → `[1, 2]`; `asTypedArray([], parser)` → `[]`.

12 per-file fixture suites — one per file in §3. Each suite covers: valid payload (byte-identical), malformed payload (same error message), edge-case payload (documented behavior change, if any).

`tests/strict_null_inventory_progress.test.ts` — add 12 new `BATCH_C_*` slice constants, one per file, each asserting the file is at 0 `as_unknown_casts` after Batch C lands. Total new constants: 12. Expected new test count delta: +12 assertions (28 → 40 in this suite).

---

## 6. Inventory Delta Predictions

| Category | Pre Batch C | Post Batch C | Δ |
|---|---:|---:|---:|
| `as_factionid_casts` | 2 | 2 | 0 |
| `as_unknown_casts` | 80 | **28** | −52 |
| `as_any_casts` | 319 | 319 | 0 |
| `non_null_assertions_dot` | 11 | 11 | 0 |
| `non_null_assertions_index` | 38 | 38 | 0 |
| `optional_fields_game_state` | 463 | 463 | 0 |

Predicted `as_unknown_casts` floor after Batch C: **28**. Remaining 28 are in singleton files (see §1 final paragraph) and are covered by the helper module post-rollout — they ride the same patterns and need no new helpers.

---

## 7. Byte-Identity Gates

| Gate | Required for Batch C | Reason |
|---|---|---|
| `npm.cmd run typecheck` | ✔ | Helper module compiles strict-null-clean; consumers still typecheck. |
| `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` | ✔ | Inventory floor proof; 12 new slice assertions. |
| `npx.cmd vitest run tests/schema_validators.test.ts tests/<per-file>_schema_boundary.test.ts --reporter=dot` | ✔ | Per-helper correctness. |
| `npm.cmd run test:baselines` | ✔ | **Critical.** All 12 files are sim-path (or sim-adjacent for the desktop_sim case); any byte-identity drift fails the gate. |
| `npm.cmd run desktop:map:build` | ✔ | `desktop_sim.ts` IPC bridge. |
| `git diff --check` | ✔ | Whitespace/conflict marker hygiene. |

Baseline-byte-identity is the load-bearing gate. The plan accepts only refactors that produce a `tools/diagnostics/strict_null_inventory.cjs` JSON snapshot matching the predicted floor AND a byte-identical 40w/52w/baseline_ops_4w/noop_4w baseline.

---

## 8. Implementation Sequencing

Batch C lands as a **single commit per file** under one PR, mirroring Batch B's sequencing precedent. Twelve commits, each with its own focused-suite vitest run and per-file diff. The final commit in the series:

1. Updates `tests/strict_null_inventory_progress.test.ts` with the 12 `BATCH_C_*` slice constants.
2. Re-runs `node tools/diagnostics/strict_null_inventory.cjs > data/derived/_debug/strict_null_inventory_post_batch_C.json` and confirms `2 / 28 / 319 / 11 / 38 / 463`.
3. Runs `npm.cmd run test:baselines` once at the tip.
4. Appends a Batch C closeout entry to `docs/PROJECT_LEDGER.md` with the inventory delta table and per-file changes.
5. Marks Batch C closed in `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`.

**Risk-ordering** (lowest to highest):

1. `sector_offensive_launch_helpers.ts` (signature loosen — type only)
2. `validateGameState.ts` (already typed; mostly cosmetic)
3. `replay_frame_summary.ts` (diagnostic-only frames)
4. `war_dispatches.ts` (LLM context — tolerant of `undefined`)
5. `desktop_sim.ts` (IPC — well-defined fallback semantics)
6. `collect_briefing.ts` (briefing assembly — tolerant of missing fields)
7. `serialize.ts` (load boundary; throw-on-failure path preserved)
8. `political_control_init.ts` (scenario-init seam; baseline-critical)
9. `oob_loader.ts` (OOB load; baseline-critical)
10. `scenario_loader.ts` (top-level scenario seam; baseline-critical)
11. `war_timeline.ts` (cross-file engine state)
12. `brigade_temporal_emit.ts` (highest risk — engine-state-shape reads with side-effecting "no temporal emit" fallbacks)

The implementation lane SHOULD land low-risk first; a baseline-identity slip on `brigade_temporal_emit.ts` is recoverable mid-series, whereas a slip on the early commits cascades.

---

## 9. Acceptance Criteria (for the follow-up implementation lane)

- `src/state/schema_validators.ts` exists with six primitives + JSDoc + unit tests.
- Each of the 12 files has its `as_unknown_casts` count at 0 in `node tools/diagnostics/strict_null_inventory.cjs` output.
- 12 new per-file `tests/<name>_schema_boundary.test.ts` files exist; each passes.
- `tests/strict_null_inventory_progress.test.ts` includes 12 new `BATCH_C_*` slice constants and asserts the new floor.
- `npm.cmd run typecheck` PASS.
- `npm.cmd run test:baselines` PASS — "Baseline regression: all scenarios match."
- `npm.cmd run desktop:map:build` PASS.
- `git diff --check` clean.
- `docs/PROJECT_LEDGER.md` has the Batch C closeout entry.
- `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` marks Batch C closed.
- `docs/40_reports/CONSOLIDATED_BACKLOG.md` and `docs/plans/MASTER_ROADMAP.md` strict-null rows reflect `2 / 28 / 319 / 11 / 38 / 463`.

---

## 10. Roadmap & Backlog Reconciliation Note (this packet)

Counts in the strict-null rows of `docs/40_reports/CONSOLIDATED_BACKLOG.md` (lines ~44 and ~266) and `docs/plans/MASTER_ROADMAP.md` (the "Strict-null closeout addendum" section ~line 1225) are reconciled to the **post-Batch-50/51 floor** as part of this packet:

```
Pre this packet:   as_factionid 2 / as_unknown 80 / as_any 319 / nn_dot 39 / nn_index 43 / opt_fields 463
Post Batch 50/51:  as_factionid 2 / as_unknown 80 / as_any 319 / nn_dot 11 / nn_index 38 / opt_fields 463
                                                              ^^^^^^^^^^^   ^^^^^^^^^^^^^
                                                              −28 dot       −5 index
```

These edits land alongside the plan document in this commit. They do **not** touch the FactionId paragraph wording, which remains the Batch 49 narrative — only the trailing numeric inventory line in each row is updated.

---

## 11. Out-of-Scope Cross-References (for completeness)

| Lane | Owner | Reason out of scope |
|---|---|---|
| Validator type-tightening | future | `src/cli/phase3*_*.ts`, `src/validate/*.ts` — 195 `as any` sites by design tolerate partial state |
| Save-migration `as any` cleanup | save-schema lane | `src/state/save_migration.ts` — 23 sites tied to schema version decisions |
| GameStateAdapter Phase 5 follow-up | UI/engine FactionId unification | 8 `as any` + 2 `as FactionId` retained sites |
| MapContainer library-boundary | MapLibre/Deck.gl typings | 12 sites requiring `@types` upgrades |
| Save-shape index assertions | save-schema lane | ~30 sites across `treaty_apply.ts`, `supply_reserves.ts`, etc. |
| `war_militia_strength` latent bug | new behavior plan | 3 sites in `minority_erosion.ts` write to nonexistent top-level field |
| Optional `GameState` field promotion | save-shape lane | 463 fields require save-migration decisions |
