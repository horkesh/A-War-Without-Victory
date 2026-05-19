# Strict-Null Batch 45 — War Pipeline FactionId-Cast Slice

**Date:** 2026-05-19
**Branch:** `codex/teslic-collateral-and-strict-null-2026-05-19` (from `main` at `5358f968`; follows Batch 44 at `cb5e1478`)
**Plan:** `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`
**Class:** Cross-phase war-pipeline narrow. **Behavior-preserving / byte-identical.**

## Scope

Cleaned 10 inventory-counted `as_factionid_casts` escapes in the single largest remaining bucket — `src/sim/turn_phases/war_phases.ts` (151-step war pipeline). All removed casts were redundant under the current `FactionId = string` alias. The file retains 6 other-category escapes (1 `as_any_casts`, 1 `non_null_assertions_dot`, 4 `non_null_assertions_index`) that are deliberately preserved as save-shape contracts and are out of scope for this lane.

## Cast sites removed

| Line | Context | Cast removed |
|---:|---|---|
| 1068 | `botFactions.map(async (faction: string) => generateArmyDecision(..., faction as FactionId, ...))` | Explicit `faction: string` parameter; cast to alias is no-op. |
| 1104 | `for (const faction of botFactions) generateCorpsDecisions(..., faction as FactionId, ...)` | `botFactions: string[]` per L1095-1100 map/filter chain. |
| 1279 | `extractCorpsAiReport(context.state, faction as FactionId)` | `faction` from `(context.state.factions ?? []).map(f => f.id)` is `FactionId[]` ≡ `string[]`. |
| 1308 | `generateCorpsStanceOrders(..., playerFaction as FactionId, ...)` | After L1295 `if (!playerFaction) return;` guard, `playerFaction` narrows to `FactionId`. |
| 1320 | `generateLevel1StanceProposals(state, playerFaction as FactionId)` | Same `!playerFaction` guard pattern at L1318. |
| 1359 | `applyBotOpportunityDecisions(state, turn, playerFaction as FactionId \| null)` | `playerFaction = state.meta.player_faction ?? null` is already `FactionId \| null`. |
| 1373 | `generateOpportunityProposalReviews(state, playerFaction as FactionId)` | `!playerFaction` guard at L1372. |
| 1391 | `generateLevel1OpProposals(state, playerFaction as FactionId)` | `!playerFaction` guard at L1389. |
| 1935 | `attacker_faction: b.attacker_faction as FactionId` | Container array `osidBattles` is `Array<{...attacker_faction: FactionId...}>` declared at L1916; source `b.attacker_faction` is `string` per attack_resolution_osid battle type. Under the alias, no-op. |
| 1936 | `defender_faction: b.defender_faction as FactionId` | Same as L1935. |

## Out-of-scope escapes deliberately preserved in war_phases.ts

| Line | Category | Site | Reason preserved |
|---:|---|---|---|
| 301 | `non_null_assertions_dot` | `context.report.events_fired!.push(...)` | Report shape preserved; report assembly contract. |
| 607 | `non_null_assertions_index` | `state.military.general_supply_reserve![fkey] = ...` | Save-shape — adding `if (!state.military.general_supply_reserve) state.military.general_supply_reserve = {}` would shift serialized save shape from `undefined` to `{}` on turn 0 and break byte-identity (same pattern as Batch 19 commander_march_correction precedent recorded in `feedback_save_shape_overrides_type_cleanup`). |
| 608 | `non_null_assertions_index` | `state.military.general_supply_reserve![fkey] ?? 0` | Same. |
| 609 | `non_null_assertions_index` | `state.military.heavy_munitions_reserve![fkey] = ...` | Same. |
| 610 | `non_null_assertions_index` | `state.military.heavy_munitions_reserve![fkey] ?? 0` | Same. |
| 3069 | `as_any_casts` | `} as any;` widening on a phase context return | Pipeline-step structural assembly; removing requires a typed step-return refactor across the war pipeline. Out of scope for a strict-null cleanup lane. |

## New batch slice in inventory progress test

```ts
const WAR_PIPELINE_BATCH_45_FILES = [
    'src/sim/turn_phases/war_phases.ts',
];

it('cleans the Batch 45 war pipeline FactionId-cast slice', () => {
    // war_phases.ts retains save-shape-preserving non-null assertions on
    // optional supply_reserve / heavy_munitions_reserve / events_fired
    // collections plus one deliberately preserved `as any` widening. Those
    // are documented as out-of-scope per the lane's save-shape stop-gate
    // (analogous to the Batch 19 commander_march_correction precedent).
    // This slice pins only the as_factionid_casts category at zero.
    const factionIdCount = phaseCount(current, 'as_factionid_casts', WAR_PIPELINE_BATCH_45_FILES);
    expect(factionIdCount).toBe(0);
});
```

The pin is restricted to the `as_factionid_casts` category to reflect this batch's actual scope (FactionId-cast removal only, save-shape & `as any` retained). The slice test would fail with the all-categories sum used by earlier batches because of the 6 preserved escapes documented above.

## Verification

- `npm.cmd run typecheck`: PASS
- `node_modules/.bin/vitest run tests/strict_null_inventory_progress.test.ts`: **24/24 PASS** (was 23/23; added Batch 45 slice)
- `npm.cmd run test:baselines`: **"Baseline regression: all scenarios match"** — 40w/52w/baseline_ops_4w/noop_4w byte-identical to the post-Batch-44 baseline floor

## Inventory delta

| Category | Before Batch 45 (after 44) | After Batch 45 | Cumulative since Batch 42 floor |
|---|---:|---:|---:|
| `as_factionid_casts` | 38 (11 files) | **28 (10 files)** | -36 / -14 files (was 64 / 24) |
| `as_unknown_casts` | 93 | 93 | 0 |
| `as_any_casts` | 359 | 359 | 0 |
| `non_null_assertions_dot` | 40 | 40 | 0 |
| `non_null_assertions_index` | 43 | 43 | 0 |

`war_phases.ts` drops from 10 → 0 in the `as_factionid_casts` category. It retains the 6 preserved escapes documented above and stays in the inventory file list under the other categories.

Cumulative Batch 43 + 44 + 45 reduction: **36 `as_factionid_casts` sites removed across 14 files cleaned**.

## Stop-gate compliance

Per the lane prompt:
- ✗ **Did not touch** `GameStateAdapter.ts` (Phase 5).
- ✗ **Did not touch** Phase 2 combat long-tail (21 classified-blocked escapes).
- ✗ **Did not touch** save-shape commander-movement casts — explicitly preserved the 4 `state.military.general_supply_reserve!`/`heavy_munitions_reserve!` non-null index assertions at L607-610 under the same save-shape precedent.
- ✗ **Did not touch** loader JSON guards requiring schema redesign.
- ✗ **Did not touch** paramilitary / supply / fatigue gated files.
- ✓ **Touched only** redundant `as FactionId` patterns where the source expression already had the equivalent type under the alias and a downstream null/undefined guard already covered nullish narrowing where needed.

## Hash impact

No scenario re-run needed. Type-only erasure → compiled JS byte-equivalent. `npm.cmd run test:baselines` confirms 40w/52w/baseline_ops_4w/noop_4w byte-identical to the prior baseline floor. No `data/derived/scenario/baselines/manifest.json` refresh needed.
