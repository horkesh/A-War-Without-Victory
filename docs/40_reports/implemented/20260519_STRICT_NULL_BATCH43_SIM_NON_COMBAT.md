# Strict-Null Batch 43 — Sim Non-Combat Safe Slice

**Date:** 2026-05-19
**Branch:** `codex/teslic-collateral-and-strict-null-2026-05-19` (from `main` at `5358f968`)
**Plan:** `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`
**Class:** Phase 2/3 non-combat continuation. **Behavior-preserving / byte-identical.**

## Scope

Cleaned 13 inventory-counted `as_factionid_casts` escapes across 5 sim non-combat files outside the Phase 2 combat long-tail (blocked) and Phase 5 GameStateAdapter (deferred). All removed casts were redundant under the current `FactionId = string` alias and produced no observable behavior change.

## Files cleaned (counts)

| File | Sites removed | Cast sites |
|---|---:|---|
| `src/sim/compile_turn_summary.ts` | 5 | L311 `Object.keys(...) as FactionId[]`; L379 `pc[osid] as FactionId \| undefined`; L387 `Object.keys(areaByFaction) as FactionId[]`; L394 `Object.keys(reserves) as FactionId[]`; L422 `faction as FactionId` |
| `src/sim/local_truces.ts` | 4 | L96 `'RS' as FactionId` + `'HRHB' as FactionId`; L297 `'RS' as FactionId`; L298 `'HRHB' as FactionId` |
| `src/sim/events/evaluate_events.ts` | 4 | L171 `state.meta.player_faction as FactionId \| undefined`; L222 `def.responding_faction as FactionId \| undefined`; L223 `def.dimension_shifts?.[0]?.faction as FactionId \| undefined`; L224 nested response_options chain |
| `src/sim/codex/dynamic_section_builder.ts` | 2 (1 line) | L179 `(state.meta?.player_faction as FactionId \| undefined) ?? ('RBiH' as FactionId)` — both casts removed in one edit |
| `src/sim/consolidation_scoring.ts` | 1 | L150 `return best as FactionId \| null` (best is `string \| null`) |
| **Total** | **16 cast sites collapsed to 13 inventory-counted entries** | (test inventory counts `as FactionId` patterns; double-cast lines collapse to 2 entries each) |

## Mechanism

All 13 escapes were redundant `as FactionId` / `as FactionId | undefined` / `as FactionId | null` / `as FactionId[]` casts where the source expression already had the equivalent type under `FactionId = string` (declared at `src/state/game_state.ts:45`). Removal sequence per cast:

1. **`Object.keys(...) as FactionId[]` patterns** (compile_turn_summary L311/L387/L394): `Object.keys` returns `string[]`, and `FactionId[]` is `string[]` under the alias. Removed cast and let TS infer.
2. **`'RS' as FactionId` / `'HRHB' as FactionId` literal casts** (local_truces L96/L297/L298): string-literal-to-string-alias is a no-op. Removed cast; the resulting `accepted['RS']` / `accepted['HRHB']` indexes `Record<FactionId, boolean>` (= `Record<string, boolean>`) with a string literal, which is type-clean.
3. **`state.meta.player_faction as FactionId | undefined`** (evaluate_events L171, dynamic_section_builder L179): `player_faction?: FactionId` per schema → already `FactionId | undefined`. Removed cast.
4. **`def.responding_faction as FactionId | undefined`** (evaluate_events L222) and the two nested `DimensionShift.faction` casts (L223, L224): all source types are already `FactionId | undefined` (responding_faction is `?: FactionId`; dimension_shifts is `?: DimensionShift[]` with non-optional `faction: FactionId`, optional chain → `FactionId | undefined`). Removed cast.
5. **`pc[osid] as FactionId | undefined`** (compile_turn_summary L379): `political_controllers: Record<SettlementId, FactionId | null>`. Source type is `FactionId | null | undefined`. Cast stripped `null` to undefined-only, but downstream `if (!faction) continue;` immediately narrows away both nullish values. Removed cast; downstream narrowing now handles both null and undefined together (semantically identical control flow).
6. **`faction as FactionId`** (compile_turn_summary L422): `faction` comes from `Object.entries(truce_broken_turn ?? {})` where `truce_broken_turn?: Record<FactionId, number>`. The key is `string` (Object.entries always returns string keys), but stored as object shorthand `faction,` field-typed as `FactionId = string`. Type-clean without cast.
7. **`best as FactionId | null`** (consolidation_scoring L150): `best: string | null` declared inline at L142. `string | null` ≡ `FactionId | null` under the alias. Removed cast.

## Tests

Added new batch slice to `tests/strict_null_inventory_progress.test.ts`:

```ts
const SIM_NON_COMBAT_BATCH_43_FILES = [
    'src/sim/codex/dynamic_section_builder.ts',
    'src/sim/compile_turn_summary.ts',
    'src/sim/consolidation_scoring.ts',
    'src/sim/events/evaluate_events.ts',
    'src/sim/local_truces.ts',
];

it('cleans the Batch 43 sim non-combat safe slice', () => { /* expects zero escapes across all 5 */ });
```

## Verification

- `npm.cmd run typecheck`: PASS
- `node_modules/.bin/vitest run tests/strict_null_inventory_progress.test.ts`: **22/22 PASS** (was 21/21; added one slice assertion)
- `node_modules/.bin/vitest run tests/events_evaluate.test.ts tests/event_decisions.test.ts tests/compile_turn_summary_washington_timing.test.ts tests/event_response_ownership_catalog.test.ts`: **28/28 PASS**
- `node_modules/.bin/vitest run tests/local_truces.test.ts tests/consolidation_scoring.test.ts`: **71/71 PASS**
- `npm.cmd run test:baselines`: **"Baseline regression: all scenarios match"** — byte-identical 40w/52w/baseline_ops_4w/noop_4w to the prior baseline floor

## Inventory delta

| Category | Before Batch 43 | After Batch 43 | Delta |
|---|---:|---:|---:|
| `as_factionid_casts` | 64 (24 files) | **48 (19 files)** | **-16 / -5 files** |
| `as_unknown_casts` | 93 | 93 | 0 |
| `as_any_casts` | 359 | 359 | 0 |
| `non_null_assertions_dot` | 40 | 40 | 0 |
| `non_null_assertions_index` | 43 | 43 | 0 |

Five files now fully CLEAN for the inventory regex: `compile_turn_summary.ts`, `local_truces.ts`, `evaluate_events.ts`, `dynamic_section_builder.ts`, `consolidation_scoring.ts`. Net reduction of 16 `as FactionId*` sites from the project-wide inventory.

## Stop-gate compliance

Per the lane prompt:
- ✗ **Did not touch** `src/ui/map/data/GameStateAdapter.ts` (Phase 5 — explicitly skipped).
- ✗ **Did not touch** the 21 classified-blocked Phase 2 combat long-tail escapes (per `docs/40_reports/audits/20260518_STRICT_NULL_PHASE2_LONG_TAIL_CLASSIFICATION.md`).
- ✗ **Did not touch** save-shape-preserving commander movement casts (`commander_march_correction.ts`).
- ✗ **Did not touch** JSON loader guards requiring schema redesign.
- ✗ **Did not touch** paramilitary / supply / fatigue gated files.
- ✓ **Touched only** sim-orchestration boundary files that already typed the data correctly and where casts were no-ops.

## Hash impact

No scenario re-run was executed because the cleaned casts are type-system no-ops under the `FactionId = string` alias. The compiled JS is byte-equivalent (TS-only erasure), and `npm.cmd run test:baselines` confirms 40w/52w/baseline_ops_4w/noop_4w byte-identical output to the prior baseline floor. No `data/derived/scenario/baselines/manifest.json` refresh needed.
