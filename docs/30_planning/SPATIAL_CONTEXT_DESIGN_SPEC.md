# SpatialContext Design Specification

**Author**: Technical Architect
**Date**: 2026-03-29
**Status**: DESIGN (research only, no code)

## 1. Problem Statement

The war pipeline rebuilds OSID adjacency data **15+ times per turn** from the same immutable edge list. Every system that needs spatial awareness (BFS, pathfinding, connected components, friendly territory sets) builds its own copy. This causes:

1. **Wasted computation**: `buildOsidAdjacency(edges)` called 15+ times/turn with identical `edges`.
2. **Inconsistent "friendly" definitions**: Some systems BFS through faction-controlled OSIDs, others through raw adjacency, others through shared-boundary adjacency. The definition of "friendly" is not shared.
3. **Stale spatial data**: Systems that run early in the pipeline may compute friendly components before combat flips OSIDs, then other systems rely on pre-flip data.
4. **Bug surface**: The `bfsDistance` in `sector_utils.ts` uses raw adjacency (no faction filter), letting brigades appear "close" through enemy territory.

## 2. Inventory of Spatial Data Producers

### 2.1 Adjacency Maps (from `osid_adjacency.ts`)

| Function | What it builds | Call sites (src/sim only) |
|---|---|---|
| `buildOsidAdjacency(edges)` | Full OSID adjacency (all edges) | **22 call sites** across 15 files |
| `buildSharedBoundaryAdjacency(edges)` | Filtered adjacency (shared boundary, 5.5m threshold) | `corps_front_sectors.ts` only (2 calls) |

### 2.2 `buildOsidAdjacency` Call Sites in Pipeline (war_phases.ts)

| Pipeline Step | Line | Variable |
|---|---|---|
| `update-siege-counters` | 505 | `adjacency` |
| `assign-brigades-to-subsegments` | 625 | `adjacency` |
| `distribute-brigades-to-front` | 662 | `adjacency` |
| `return-displaced-brigades` | 673 | `adjacency` |
| `compute-home-distance-cache` | 834 | `adjacency` |
| `generate-army-reserve-requests` | 1013 | `adjacency` |

### 2.3 `buildOsidAdjacency` Call Sites in Combat Functions (called from pipeline)

| File | Function | Called from pipeline step |
|---|---|---|
| `bot_brigade_ai_osid.ts` | `generateAllBotOrdersOsid` | `generate-bot-brigade-orders` |
| `bot_corps_ai.ts` | `generateAllCorpsOrders` (via `generateCorpsDirectives`) | `generate-bot-corps-orders` |
| `bot_corps_directives.ts` | `generateCorpsDirectives` | `generate-bot-corps-orders` |
| `bot_corps_helpers.ts` | helper functions | `generate-bot-corps-orders` |
| `bot_corps_operations.ts` | `evaluateCorpsOffensiveLaunch` | `generate-bot-corps-orders` |
| `corps_front_sectors.ts` | `buildCorpsFrontSectors` | `partition-corps-front-sectors` |
| `combat_predictor.ts` | receives adjacency as param | various (bot AI, attack resolution) |
| `attack_resolution_osid.ts` | `resolveAttackOrdersOsid`, `displaceFormationsInEnemyTerritory` | `resolve-attack-orders`, `displace-enemy-territory` |
| `brigade_movement_orders.ts` | `applyBrigadeMovementOrders` | `apply-brigade-movement` |
| `osid_column_movement.ts` | `processOsidColumnMovement` | `osid-column-movement` |
| `paramilitary_sweep.ts` | `detectParamilitaryTargets`, `detectOffensiveParamilitaryTargets` | `paramilitary-detect`, `offensive-paramilitary-detect` |
| `rear_pocket_consolidation.ts` | `consolidateRearPockets` | `consolidate-rear-pockets` |
| `brigade_home_return.ts` | `evaluateHomeReturn` | `return-displaced-brigades` |

### 2.4 BFS/Pathfinding Functions

| Function | Location | Type | Known Issues |
|---|---|---|---|
| `bfsDistanceFriendly` | `combat_math.ts:155` | Friendly-only BFS | Correct |
| `bfsDistance` | `sector_utils.ts:174` | **Raw adjacency** (no faction filter) | **BUG**: used by `brigade_front_distribution.ts` and `subsegment_assignment.ts` |
| `bfsToNearestSector` | `sector_utils.ts:136` | Friendly-only BFS | Correct |
| `bfsFriendlyDistance` | `war_phases.ts:2538` | Friendly-only BFS (local) | Correct |
| `bfsRawDistance` | `war_phases.ts:2517` | Raw adjacency (local, unused) | Dead code after n1198 fix |
| `bfsDistanceToAny` | `brigade_home_return.ts:91` | Friendly-only BFS | Correct |
| `bfsDistanceToCapital` | `attack_resolution_osid.ts:203` | Friendly-only BFS | Correct |
| `bfsDistanceToTargets` | `operation_reinforcement.ts:44` | Friendly-only BFS | Correct |
| `friendlyDistanceToAny` | `brigade_assignment.ts` | Friendly-only BFS | Correct |
| `buildFriendlyComponents` | `sector_utils.ts:37` | Component partition | Correct |
| `findConnectedComponents` | `utils/graph.ts:11` | Generic CC utility | Correct |

### 2.5 Edge-Level Adjacency (Sector System)

| Function | Location | Purpose |
|---|---|---|
| `buildEdgeAdjacency` | `sector_edge_adjacency.ts:63` | Front edge connectivity (triple-junction, 33m threshold) |
| `buildEdgeAdjacencyStrictCaseB` | `sector_edge_adjacency.ts:187` | Strict Case B for sector splitting (5.5m) |

These are **not candidates for SpatialContext** -- they operate on front-edge IDs, not OSIDs, and are internal to the sector system. They already receive adjacency as parameters.

### 2.6 Non-Pipeline Call Sites

| File | Context |
|---|---|
| `supply_state_derivation.ts` (2 calls) | Supply OSID derivation, called from `supply-osid` step |
| `supply_reachability_osid.ts` (1 call) | Supply reachability, called from `supply-osid` step |
| `event_types.ts` (1 call) | Event condition evaluation |
| `early_war_phases.ts` (1 call) | Peace-phase step |
| `oob_early_war_entry.ts` (1 call) | OOB initialization (scenario load) |
| `desktop_sim.ts` (1 call) | Desktop UI (outside pipeline) |

## 3. Interface Design

```typescript
// src/sim/spatial_context.ts

import type { EdgeRecord } from '../map/settlements.js';
import type { Osid } from './combat/osid_adjacency.js';
import type { FactionId } from '../state/game_state.js';

/**
 * SpatialContext: immutable spatial snapshot computed at pipeline boundaries.
 * All spatial queries during a pipeline phase use this instead of rebuilding.
 *
 * Invalidated and recomputed after any step that changes political_controllers.
 */
export interface SpatialContext {
    /** Full OSID adjacency map (all edges, sorted neighbor lists). Immutable within a phase. */
    readonly adjacency: ReadonlyMap<Osid, readonly Osid[]>;

    /** Shared-boundary adjacency (5.5m threshold). Used only by sector system. */
    readonly sharedBoundaryAdjacency: ReadonlyMap<Osid, readonly Osid[]>;

    /** Per-faction set of controlled OSIDs, derived from political_controllers. */
    readonly friendlyOsidsByFaction: ReadonlyMap<FactionId, ReadonlySet<string>>;

    /** Per-faction connected component map (OSID -> component index). */
    readonly componentsByFaction: ReadonlyMap<FactionId, ReadonlyMap<string, number>>;

    /** OSID front edges snapshot (if available). */
    readonly frontEdgesOsid: readonly EdgeRecord[] | undefined;

    /** Turn number when this context was computed. For staleness detection. */
    readonly computedAtTurn: number;

    /** Pipeline phase marker: 'pre-combat' | 'post-combat'. */
    readonly phase: 'pre-combat' | 'post-combat';
}

/**
 * Compute a fresh SpatialContext from current state.
 * Pure function: reads edges + political_controllers, produces immutable snapshot.
 */
export function computeSpatialContext(
    edges: EdgeRecord[],
    politicalControllers: Record<string, string | null | undefined>,
    factions: readonly FactionId[],
    turn: number,
    phase: 'pre-combat' | 'post-combat',
    frontEdgesOsid?: EdgeRecord[],
): SpatialContext;

// --- Convenience query functions that operate on SpatialContext ---

/** BFS distance through friendly territory for a specific faction. */
export function spatialFriendlyDistance(
    ctx: SpatialContext,
    faction: FactionId,
    from: string,
    to: string,
    maxHops?: number,
): number;

/** Check if two OSIDs are in the same connected component for a faction. */
export function spatialSameComponent(
    ctx: SpatialContext,
    faction: FactionId,
    a: string,
    b: string,
): boolean;

/** Get the friendly OSID set for a faction. */
export function spatialFriendlyOsids(
    ctx: SpatialContext,
    faction: FactionId,
): ReadonlySet<string>;
```

### 3.1 What SpatialContext Does NOT Include

- **Edge-level adjacency** (`buildEdgeAdjacency`): Sector-internal, operates on front edge IDs not OSIDs. Remains as-is.
- **SID-level adjacency** (`buildAdjacencyMap`): Settlement-level, used only by legacy pressure/supply paths. Out of scope.
- **BFS distance caches**: These are per-query with different start/end/maxHops. Caching would add complexity for minimal gain. The adjacency map and friendlyOsids are the expensive parts to rebuild; BFS itself is O(V+E) on already-built data.
- **Supply reachability**: Conceptually related but has its own pipeline step and different traversal rules (supply nodes, faction capitals). Stays separate.

## 4. Pipeline Insertion Points

### 4.1 Current Pipeline Flow (relevant subset)

```
load-operational-data          ← edges loaded, cached on context
supply-osid                    ← builds adjacency internally (3x: supply_reachability_osid, supply_state_derivation x2)
update-siege-counters          ← builds adjacency
partition-corps-front-sectors  ← builds adjacency + sharedBoundaryAdj + friendlyOsids + components
assign-brigades-to-subsegments ← builds adjacency
distribute-brigades-to-front   ← builds adjacency (+ bfsDistance BUG: raw adjacency)
return-displaced-brigades      ← builds adjacency
compute-sector-combat-ratings
paramilitary-detect            ← builds adjacency
consolidate-rear-pockets       ← builds adjacency
compute-home-distance-cache    ← builds adjacency
generate-bot-corps-orders      ← builds adjacency (bot_corps_ai, bot_corps_directives, bot_corps_helpers, bot_corps_operations)
generate-army-reserve-requests ← builds adjacency
generate-bot-brigade-orders    ← builds adjacency (bot_brigade_ai_osid)
osid-column-movement           ← builds adjacency
apply-brigade-movement         ← builds adjacency
resolve-attack-orders          ← builds adjacency (2x in attack_resolution_osid)
                               *** POLITICAL CONTROLLERS CHANGE HERE ***
displace-enemy-territory       ← (no adjacency rebuild, but should use post-combat context)
rederive-osid-front-segments   ← front edges change
recall-drifted-brigades        ← builds raw adj inline (war_phases.ts)
```

### 4.2 Proposed SpatialContext Computation Points

**Point 1: `compute-spatial-context-pre-combat`**
- Insert immediately after `load-operational-data` (or after `supply-osid` if supply needs to remain self-contained)
- Computes: adjacency, sharedBoundaryAdj, friendlyOsidsByFaction, componentsByFaction, frontEdgesOsid
- All steps from `update-siege-counters` through `resolve-attack-orders` use this

**Point 2: `compute-spatial-context-post-combat`**
- Insert immediately after `resolve-attack-orders` (which flips political_controllers)
- Recomputes: friendlyOsidsByFaction, componentsByFaction (adjacency unchanged -- edges don't change)
- Used by: `displace-enemy-territory`, `recall-drifted-brigades`, `rederive-osid-front-segments`, and any post-combat assertions

### 4.3 Context Storage

Follow the existing `OperationalDataCache` pattern:

```typescript
// In turn_pipeline_types.ts
export interface SpatialContextCache {
    preCombat: SpatialContext;
    postCombat?: SpatialContext;  // undefined until resolve-attack-orders runs
}

export function getSpatialContext(context: TurnContext): SpatialContextCache | undefined;
export function setSpatialContext(context: TurnContext, cache: SpatialContextCache): void;
```

## 5. Migration Plan

### Phase 0: Foundation (1 commit, no behavior change)
1. Create `src/sim/spatial_context.ts` with the interface and `computeSpatialContext()`.
2. Add `SpatialContextCache` to `turn_pipeline_types.ts` with getter/setter.
3. Add two pipeline steps to `war_phases.ts`:
   - `compute-spatial-context-pre-combat` after `supply-osid`
   - `compute-spatial-context-post-combat` after `resolve-attack-orders`
4. Both steps compute and cache the context but nothing reads it yet.
5. Smoke test: `tsc --noEmit` + `vitest run` + `desktop:map:build`.

### Phase 1: Pipeline Direct Consumers (6 files, ~1 change each)
Migrate the 6 direct `buildOsidAdjacency` calls in `war_phases.ts` to read from `getSpatialContext(context)`:

| Step | Current | After |
|---|---|---|
| `update-siege-counters` | `buildOsidAdjacency(od.edges)` | `spatial.adjacency` |
| `assign-brigades-to-subsegments` | `buildOsidAdjacency(od.edges)` | `spatial.adjacency` |
| `distribute-brigades-to-front` | `buildOsidAdjacency(od.edges)` | `spatial.adjacency` |
| `return-displaced-brigades` | `buildOsidAdjacency(od.edges)` | `spatial.adjacency` |
| `compute-home-distance-cache` | `buildOsidAdjacency(od.edges)` | `spatial.adjacency` |
| `generate-army-reserve-requests` | `buildOsidAdjacency(od.edges)` | `spatial.adjacency` |

Also: migrate `recall-drifted-brigades` to use `spatial.adjacency` + `spatial.friendlyOsidsByFaction` instead of building its own raw adjacency inline.

**Bug fix opportunity**: `distribute-brigades-to-front` calls `bfsDistance()` which uses raw adjacency. When migrating, pass `spatial.friendlyOsidsByFaction.get(faction)` to a friendly-only BFS instead. Same for `subsegment_assignment.ts:136`.

### Phase 2: Sector System (1 file)
`corps_front_sectors.ts` / `buildCorpsFrontSectors` currently builds its own adjacency, sharedBoundaryAdj, friendlyOsids, and components. Change its signature to accept `SpatialContext`:

```typescript
// Before:
export function buildCorpsFrontSectors(state, edges, reverseMap, centroids)

// After:
export function buildCorpsFrontSectors(state, spatial: SpatialContext, reverseMap, centroids)
```

The function extracts `spatial.adjacency`, `spatial.sharedBoundaryAdjacency`, `spatial.friendlyOsidsByFaction.get(faction)`, `spatial.componentsByFaction.get(faction)` instead of rebuilding them.

This is the highest-value migration: `buildCorpsFrontSectors` rebuilds adjacency, sharedBoundaryAdj, friendlyOsids, AND components internally. All redundant.

### Phase 3: Bot AI Chain (4 files)
These all build their own adjacency from edges:

| File | Function | Migration |
|---|---|---|
| `bot_brigade_ai_osid.ts` | `generateAllBotOrdersOsid` | Add `spatial` to `OsidBotContext`, use `ctx.spatial.adjacency` |
| `bot_corps_ai.ts` | `generateAllCorpsOrders` | Pass `spatial` through, use `.adjacency` |
| `bot_corps_directives.ts` | `generateCorpsDirectives` | Pass `spatial` through, use `.adjacency` + `.friendlyOsidsByFaction` |
| `bot_corps_helpers.ts` | helper functions | Pass `spatial` through |
| `bot_corps_operations.ts` | `evaluateCorpsOffensiveLaunch` | Pass `spatial` through |

The `OsidBotContext` interface grows one field:

```typescript
interface OsidBotContext {
    edges: EdgeRecord[];
    spatial: SpatialContext;  // NEW
    reverseMap: ...;
    // ... rest unchanged
}
```

### Phase 4: Attack Resolution & Movement (3 files)
| File | Function |
|---|---|
| `attack_resolution_osid.ts` | `resolveAttackOrdersOsid` (2 internal calls) |
| `brigade_movement_orders.ts` | `applyBrigadeMovementOrders` |
| `osid_column_movement.ts` | `processOsidColumnMovement` |

These receive `edges` and build adjacency internally. Change to accept `SpatialContext` instead.

**Important**: `resolveAttackOrdersOsid` modifies `political_controllers` during execution. It should use pre-combat SpatialContext for all combat resolution. The post-combat SpatialContext is computed after this step returns.

### Phase 5: Paramilitary & Pockets (2 files)
| File | Function |
|---|---|
| `paramilitary_sweep.ts` | `detectParamilitaryTargets` (2 calls), `detectOffensiveParamilitaryTargets` |
| `rear_pocket_consolidation.ts` | `consolidateRearPockets` |

### Phase 6: Supply System (2 files, optional)
| File | Function |
|---|---|
| `supply_reachability_osid.ts` | `computeSupplyReachabilityOsid` |
| `supply_state_derivation.ts` | `deriveCorridorsOsid`, `deriveSupplyStateByOsid` |

These run in `supply-osid` which is BEFORE the pre-combat SpatialContext. Two options:
- **(A)** Move SpatialContext computation before supply (adjacency is needed there too).
- **(B)** Leave supply self-contained. It only needs the adjacency map (immutable from edges), not faction-aware data.

**Recommendation**: Option (A). Move `compute-spatial-context-pre-combat` to immediately after `load-operational-data`, before `supply-osid`. Supply can read `spatial.adjacency` without needing faction data.

### Phase 7: Event System & Edge Cases (2 files)
| File | Notes |
|---|---|
| `event_types.ts` | Event conditions build adjacency ad-hoc. Pass spatial through event context. |
| `early_war_phases.ts` | Peace-phase step. Needs its own spatial context (different phase). Low priority. |

### Phase 8: External Consumers (not in pipeline)
| File | Notes |
|---|---|
| `desktop_sim.ts` | UI query. Build SpatialContext on demand (not in pipeline). |
| `oob_early_war_entry.ts` | Scenario initialization. One-time cost, leave as-is. |

## 6. Risk Assessment

### Low Risk
- Phases 0-1: Pure plumbing. Same data, same computation, just cached. Zero behavior change.
- The adjacency map is deterministic and derived from immutable edges. Caching cannot introduce nondeterminism.

### Medium Risk
- Phases 2-5: Changing function signatures across the bot AI chain. Large diff but mechanically straightforward. Each file can be migrated independently; the old `buildOsidAdjacency(edges)` call is simply replaced with `spatial.adjacency`.
- Phase 6: Moving the computation point earlier affects step ordering, but since adjacency is edges-only (no state dependency), this is safe.

### Gotchas
1. **`combat_predictor.ts`** already receives adjacency as a parameter. It does NOT need to import SpatialContext -- the caller passes `spatial.adjacency` through. No change to this file.
2. **`sector_edge_adjacency.ts`** (`buildEdgeAdjacency`) operates on front-edge IDs, not OSIDs. Leave it alone.
3. **`sector_utils.ts:bfsDistance`** is the known raw-adjacency BUG. The fix is NOT in SpatialContext itself but in the callers (`brigade_front_distribution.ts`, `subsegment_assignment.ts`) which should pass friendly OSIDs to a filtered BFS. SpatialContext makes this easy: `spatial.friendlyOsidsByFaction.get(faction)` is readily available.
4. **`recallDriftedBrigades`** in `war_phases.ts` builds raw adjacency inline (lines 2480-2487). After n1198 it also does friendly BFS (lines 2504-2506). This should use `spatial.adjacency` + friendly distance from post-combat context.

## 7. Performance Impact

### Current: ~22 `buildOsidAdjacency` calls per turn
Each call iterates ~3,200 edges, builds a Map of ~712 entries with sorted neighbor lists. Cost per call: ~0.5ms. Total: ~11ms/turn wasted.

### After: 1-2 `buildOsidAdjacency` calls per turn
Pre-combat computes once. Post-combat recomputes only friendlyOsids and components (adjacency is reused, since edges don't change). Net savings: ~10ms/turn.

The real win is not performance but **correctness**: every system sees the same spatial reality within a pipeline phase. No more "system A thinks OSID X is friendly but system B disagrees because it rebuilt friendlyOsids from a stale political_controllers snapshot."

## 8. Validation Strategy

1. **Before any migration**: Capture a 40w run save as baseline.
2. **After Phase 0**: Run 40w, diff against baseline. Must be identical (no behavior change).
3. **After each subsequent phase**: Run 40w, diff. Must be identical UNLESS fixing a known bug (like the `bfsDistance` raw adjacency issue, which will change brigade distribution).
4. **The `bfsDistance` fix** should be a separate commit with its own calibration check, since it will change behavior.

## 9. File Manifest

### New Files
- `src/sim/spatial_context.ts` -- interface, compute function, query helpers

### Modified Files (by phase)

| Phase | Files |
|---|---|
| 0 | `src/sim/spatial_context.ts` (new), `src/sim/turn_pipeline_types.ts`, `src/sim/turn_phases/war_phases.ts` |
| 1 | `src/sim/turn_phases/war_phases.ts` (6 steps + recallDriftedBrigades) |
| 2 | `src/sim/combat/corps_front_sectors.ts` |
| 3 | `src/sim/combat/bot_brigade_ai_osid.ts`, `src/sim/combat/bot_corps_ai.ts`, `src/sim/combat/bot_corps_directives.ts`, `src/sim/combat/bot_corps_helpers.ts`, `src/sim/combat/bot_corps_operations.ts` |
| 4 | `src/sim/combat/attack_resolution_osid.ts`, `src/sim/combat/brigade_movement_orders.ts`, `src/sim/combat/osid_column_movement.ts` |
| 5 | `src/sim/combat/paramilitary_sweep.ts`, `src/sim/combat/rear_pocket_consolidation.ts` |
| 6 | `src/state/supply_reachability_osid.ts`, `src/state/supply_state_derivation.ts` |
| 7 | `src/sim/events/event_types.ts` |

### Untouched (by design)
- `src/sim/combat/osid_adjacency.ts` -- `buildOsidAdjacency` remains as the low-level builder, now called only by `computeSpatialContext`
- `src/sim/combat/sector_edge_adjacency.ts` -- front-edge adjacency, different domain
- `src/sim/combat/sector_utils.ts` -- `buildFriendlyComponents` may be called by `computeSpatialContext` internally
- `src/sim/combat/combat_predictor.ts` -- receives adjacency as param, no import change
- `src/sim/combat/combat_math.ts` -- `bfsDistanceFriendly` is a utility, may be called by `spatialFriendlyDistance`

## 10. Summary

| Metric | Before | After |
|---|---|---|
| `buildOsidAdjacency` calls/turn | ~22 | 1 |
| friendlyOsids rebuilds/turn | ~8 | 2 (pre + post combat) |
| component rebuilds/turn | ~3 | 2 |
| Systems with independent "friendly" definition | 8+ | 0 (all read from SpatialContext) |
| Migration commits | -- | 8 phases, each independently verifiable |
| Risk of calibration regression | -- | Zero for phases 0-1; only the `bfsDistance` fix changes behavior |
