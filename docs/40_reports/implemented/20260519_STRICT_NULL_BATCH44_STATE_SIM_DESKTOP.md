# Strict-Null Batch 44 — State + Sim + Desktop Safe Slice

**Date:** 2026-05-19
**Branch:** `codex/teslic-collateral-and-strict-null-2026-05-19` (from `main` at `5358f968`; follows Batch 43 at `be933525`)
**Plan:** `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`
**Class:** Phase 2/3/4 cross-area continuation. **Behavior-preserving / byte-identical.**

## Scope

Cleaned 10 inventory-counted `as_factionid_casts` escapes across 9 files spanning state, sim, AI commander, negotiation, turn phases, and desktop layers. All removed casts were redundant under the current `FactionId = string` alias and produced no observable behavior change.

## Files cleaned

| File | Cast sites removed | Notes |
|---|---:|---|
| `src/state/assignable_front_segments.ts` | 2 | L56 `edge.side_a as FactionId \| null, edge.side_b as FactionId \| null` — `FrontEdge.side_a` is `string \| null` (`front_edges.ts:12`), equivalent to `FactionId \| null` under the alias. Removed both casts in one edit. |
| `src/state/political_control_init.ts` | 2 | L57 `best = fid as FactionId` where `fid ∈ CANONICAL_FACTION_IDS = ['RBiH','RS','HRHB'] as const`; L84 `pc[osid] = faction as FactionId` where `faction` is `string` from `overrides[osid]`. |
| `src/state/minority_flight.ts` | 1 | L134 `value as FactionId` where `value` is `FactionId \| null` from `Object.entries(political_controllers)` after `!value` filter at L130. |
| `src/state/seed_organizational_penetration_from_control.ts` | 1 | L75 `return bestKey as FactionId` after the L74 `bestKey === null \|\| bestKey === '_null' → return null` filter narrows `bestKey` to non-null `string`. |
| `src/sim/turn_phases/early_war_phases.ts` | 1 | L212 `.sort(strictCompare) as FactionId[]` — sort returns same `string[]` type as input. |
| `src/sim/ai_commander/corps_dialogue.ts` | 1 | L241 `fmn.faction as FactionId` — `FormationState.faction: FactionId` per game_state.ts:616. |
| `src/sim/negotiation/compute_combat_effective.ts` | 1 | L61 `formation.faction as FactionId \| undefined` — `FormationState.faction: FactionId` (non-optional). The `\| undefined` cast was widening, not narrowing; the downstream `if (!faction \|\| !(faction in counts))` already guards against falsy values. |
| `src/desktop/desktop_sim.ts` | 1 | L543 `formation.faction as FactionId` — same Formation.faction type narrowing; guarded by L540 `!formation.faction` filter. |
| **Total** | **10** | — |

## New batch slice in inventory progress test

```ts
// Batch 44 lists only the files that are FULLY clean across all
// inventory categories. desktop_sim.ts, corps_dialogue.ts, and
// political_control_init.ts retain non-FactionId-cast escapes (as_unknown
// state-shape widenings + JSON.parse(...) as unknown loader guards) that
// are out of scope for this lane per the safe-slice stop-gates.
const STATE_SIM_DESKTOP_BATCH_44_FILES = [
    'src/sim/negotiation/compute_combat_effective.ts',
    'src/sim/turn_phases/early_war_phases.ts',
    'src/state/assignable_front_segments.ts',
    'src/state/minority_flight.ts',
    'src/state/seed_organizational_penetration_from_control.ts',
];

it('cleans the Batch 44 state + sim + desktop safe slice', () => { /* expects zero escapes across all 5 */ });
```

## Why three files still have escapes (out of scope)

- `src/desktop/desktop_sim.ts` retains 3 `as_unknown` casts at L289-290 widening `state.military` to access an undeclared `control_events` read-model field. Removing these requires extending `MilitaryState` with the optional read-model field, which is a save-shape decision outside this lane.
- `src/sim/ai_commander/corps_dialogue.ts` retains 1 `as_unknown` cast at L185 widening `state.military` to access an undeclared `combat_summary` field. Same class as above.
- `src/state/political_control_init.ts` retains 7 `JSON.parse(content) as unknown` casts (the canonical safe JSON-loader pattern) plus 1 `controller as any` for `CANONICAL_IDS.includes(...)` narrowing. These are loader JSON guards per the lane prompt's stop-gate ("loader JSON guards that require schema redesign") and would need a schema-validation library or a typed loader to remove safely.

The Batch 44 inventory slice was therefore restricted to the 5 files that ARE fully clean across all 5 inventory categories, with an explanatory comment in the test contract.

## Verification

- `npm.cmd run typecheck`: PASS
- `node_modules/.bin/vitest run tests/strict_null_inventory_progress.test.ts`: **23/23 PASS** (was 22/22; added Batch 44 slice assertion)
- `node_modules/.bin/vitest run tests/assignable_front_segments.test.ts tests/minority_flight.test.ts tests/corps_dialogue.test.ts`: **32/32 PASS**
- `npm.cmd run test:baselines`: **"Baseline regression: all scenarios match"** — 40w/52w/baseline_ops_4w/noop_4w byte-identical to the post-Batch-43 baseline floor

## Inventory delta

| Category | Before Batch 44 (after 43) | After Batch 44 | Cumulative since pre-43 floor |
|---|---:|---:|---:|
| `as_factionid_casts` | 48 (19 files) | **38 (11 files)** | -26 / -13 files (was 64 / 24) |
| `as_unknown_casts` | 93 | 93 | 0 |
| `as_any_casts` | 359 | 359 | 0 |
| `non_null_assertions_dot` | 40 | 40 | 0 |
| `non_null_assertions_index` | 43 | 43 | 0 |

Five additional files fully CLEAN for the inventory regex after Batch 44: `assignable_front_segments.ts`, `minority_flight.ts`, `seed_organizational_penetration_from_control.ts`, `early_war_phases.ts`, `compute_combat_effective.ts`. Three other files (`desktop_sim.ts`, `corps_dialogue.ts`, `political_control_init.ts`) had their `as_factionid_casts` entries cleaned but retain non-FactionId-cast escapes documented above.

Cumulative Batch 43 + 44 reduction: **26 `as_factionid_casts` sites removed across 13 files cleaned** without touching any blocked / gated / Phase 5 / save-shape surface.

## Stop-gate compliance

Per the lane prompt:
- ✗ **Did not touch** `src/ui/map/data/GameStateAdapter.ts` (Phase 5 — explicitly skipped).
- ✗ **Did not touch** classified-blocked Phase 2 combat long-tail.
- ✗ **Did not touch** save-shape-preserving commander movement casts.
- ✗ **Did not touch** JSON loader guards requiring schema redesign — explicitly preserved the 7 `JSON.parse(...) as unknown` casts in `political_control_init.ts`, the `as_unknown` state-widening casts in `desktop_sim.ts` and `corps_dialogue.ts`, and the AdvisorResponse loader cast in `response_parser.ts` / leader-profile loader in `political_leader_data_loader.ts`.
- ✗ **Did not touch** paramilitary / supply / fatigue gated files.
- ✓ **Touched only** files where the FactionId cast was provably a no-op under the alias and the source-expression type already had the equivalent shape.

## Hash impact

No scenario re-run needed. Type-only erasure → compiled JS byte-equivalent. `npm.cmd run test:baselines` confirms 40w/52w/baseline_ops_4w/noop_4w byte-identical to the prior baseline floor. No `data/derived/scenario/baselines/manifest.json` refresh needed.
