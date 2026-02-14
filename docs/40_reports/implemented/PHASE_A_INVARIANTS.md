# Phase A Invariants — Architecture & State Foundations

This document formalizes what Phase A guarantees, what later phases may rely on, and what is explicitly not guaranteed yet. It aligns with Engine Invariants v0.4.0 and Systems Manual v0.4.0.

**Phase A scope:** Canonical game state, deterministic weekly turn pipeline, save/load, and determinism scaffolding. Phase A establishes structural correctness and determinism, not gameplay outcomes.

---

## 1. What Phase A Guarantees

### 1.1 Canonical GameState

- **Single source of truth:** `src/state/game_state.ts` defines the authoritative `GameState` interface and all nested types.
- **Shape validation:** `validateGameStateShape` enforces the canonical schema; denylisted derived-state keys (`fronts`, `corridors`, `derived`, `cache`) are rejected.
- **Authority, control, legitimacy** are distinct concepts; political control exists at settlement level via `political_controllers`.
- **Weekly turn invariant:** `meta.turn` is a non-negative integer; one game turn = one week (Engine Invariants; CANON.md).

### 1.2 Deterministic Weekly Turn Pipeline

- **Phase order (fixed):** directives → deployments → military_interaction → fragmentation_resolution → supply_resolution → political_effects → exhaustion_update → persistence.
- **Entrypoint:** `runOneTurn(state, inputs)` in `src/state/turn_pipeline.ts`.
- **Determinism rule:** No iteration over collections without explicit sorting; `strictCompare` for key ordering (Engine Invariants §11.3).
- **Turn increment:** `meta.turn` increments by exactly +1 per turn; `meta.seed` is set from inputs.

### 1.3 Serialization and Deserialization

- **Deterministic output:** `serializeGameState` produces byte-stable JSON for identical state (sorted keys, no undefined, no Map/Set).
- **No derived state serialized:** Engine Invariants §13.1; derived states must be recomputed each turn.
- **Round-trip identity:** `serialize(deserialize(serialize(S))) === serialize(S)` for any valid state S.
- **Validation on load:** `deserializeState` runs `validateState` after migration; invalid state throws.

### 1.4 Save/Load Entrypoints

**API:** `src/state/serialize.ts`

- `serializeState(state: GameState): string` — Serialize canonical state to JSON. Validates before serialize; throws if invalid.
- `deserializeState(payload: string): GameState` — Parse, migrate, validate. Returns valid `GameState` or throws.

**Usage and guarantees:**

1. **Preconditions:** State must pass `validateState` before `serializeState`. Payload must be valid JSON parseable to a migratable structure.
2. **Schema migration:** `deserializeState` applies `migrateState` for older schema versions; new fields are defaulted deterministically.
3. **No persistence backend:** Phase A provides the serialization layer only. Callers are responsible for storage (file, database, etc.).
4. **Engine Invariants §11.4:** Save/load reconstructs world, faction, municipality, MCZ, formation, and front states for the scope implemented in Phase A.

**Intended usage:**

```ts
import { serializeState, deserializeState } from './state/serialize.js';

// Save
const json = serializeState(state);
await writeFile(path, json, 'utf8');

// Load
const payload = await readFile(path, 'utf8');
const state = deserializeState(payload);
```

### 1.5 Deterministic Re-run and State Diff

- **Same initial state + same inputs → identical final state.** Tests: `turn_pipeline_determinism_smoke.test.ts`.
- **Serialized state diff is empty** between two runs with identical inputs; canonical `serializeState` is used.
- **No tolerated nondeterminism** (Engine Invariants §11.1: no randomness; §11.2: no timestamps).

---

## 2. What Later Phases May Rely On

- **Deterministic state evolution:** Same inputs always produce same outputs.
- **Weekly turn invariant:** One turn = one week; no sub-turn or variable-length turns.
- **Stable save/load:** Serialized state is replayable; no loss of information for canonical fields.
- **Phase ordering:** Turn pipeline phases execute in fixed order; later phases may add logic to phase handlers but must not reorder phases.
- **Canonical state shape:** GameState schema is the contract; later phases extend it via migration, not by bypassing it.

---

## 3. What Phase A Explicitly Does Not Guarantee

- **Phase 0 or Phase I logic:** Not implemented; pipeline phases are stubbed.
- **Supply, displacement, AoRs, fronts, combat resolution:** Not in Phase A scope.
- **Geometry or map substrate changes:** Phase A does not modify map data.
- **Derived or transient state persistence:** Derived state is never serialized.
- **Randomness or timestamps:** None in state or artifacts.
- **Historical outcomes:** No hard-coded historical results.

---

## 4. Alignment with Canon

| Canon reference | Phase A implementation |
|-----------------|------------------------|
| Engine Invariants §11.1 No randomness | No random calls in state or pipeline |
| Engine Invariants §11.2 No timestamps | No Date.now or time-based IDs in serialization |
| Engine Invariants §11.3 Stable ordering | `strictCompare`, sorted keys in serialization |
| Engine Invariants §11.4 Reproducibility | `serializeState` / `deserializeState` |
| Engine Invariants §13.1 No derived state serialized | `validateGameStateShape` denylist; serializer rejects |
| Systems Manual save/load | `serializeState` / `deserializeState` entrypoints |

---

## 5. Phase A Task Checklist

| Task | Status |
|------|--------|
| A1.1 Canonical GameState definition | Done |
| A1.2 Weekly turn pipeline skeleton | Done |
| A1.3 Deterministic state serialization | Done |
| A1.4 Deterministic state deserialization | Done |
| A1.5 Save/load entrypoints | Done |
| A1.6 Deterministic re-run and diff tests | Done |
| A1.7 Phase A invariants documentation | Done (this document) |
