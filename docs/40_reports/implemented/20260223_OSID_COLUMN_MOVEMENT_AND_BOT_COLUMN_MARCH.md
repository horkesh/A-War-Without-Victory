# OSID Terrain-Weighted Column Movement & Bot Column March

**Date:** 2026-02-23
**Status:** Completed
**Spec:** `C:\Users\User\.claude\plans\glistening-popping-quilt.md` (Parts 2 + 4)

---

## 1. Summary

Implemented terrain-weighted multi-hop column movement for brigade redeployment (Part 2) and bot AI column march orders for interior brigades (Part 4) of the Brigade Movement & Initial Placement Overhaul plan. Column brigades undeploy, transit through rear areas at composition-dependent speed using Dijkstra pathfinding with terrain-weighted edge costs, and redeploy at their destination. This enables strategic redeployment of reserves from deep rear to the front line across multiple turns.

---

## 2. Column Movement System (Part 2)

### 2.1 New File: `src/sim/phase_ii/osid_column_movement.ts`

Core module implementing OSID-native column transit with terrain-weighted pathfinding.

**Exported functions:**

| Function | Purpose |
|----------|---------|
| `averageTerrainForOsid()` | Aggregates canonical SID terrain scalars into OSID-level averages via `OperationalToCanonicalReverseMap` |
| `getOsidEdgeMovementCost()` | Computes terrain-weighted edge cost between two OSIDs. Factors: road quality (0.6x-1.0x), slope (+0.8x), terrain friction (+0.6x), river crossing (+0.5), uphill penalty (+elevation/500). Range: ~0.6 to ~3.5 |
| `getOsidColumnRate()` | Column movement budget per turn by composition: heavy mech (>5% tanks+arty) = 2, light infantry (<1.5%) = 4, mixed = 3 |
| `dijkstraFriendlyPath()` | Dijkstra shortest path through friendly-controlled OSIDs with terrain-weighted edges. Deterministic tie-breaking via `strictCompare` |
| `processOsidColumnMovement()` | Main pipeline step: Pass 1 advances existing transits (decrement turns_remaining, arrive at destination), Pass 2 processes new column orders (compute path, set in_transit). Two-pass order prevents same-turn advance on newly issued orders |
| `OSID_COLUMN_BASE_RATE` | Exported constant = 3 (mixed composition base rate) |

### 2.2 Edge Cost Formula

```
cost = roadFactor * slopeFactor * frictionFactor * uphillFactor + riverPenalty
```

| Factor | Formula | Range | Effect |
|--------|---------|-------|--------|
| Road | `1.0 - roadAvg * 0.4` | 0.6 - 1.0 | Good roads reduce cost to 0.6x |
| Slope | `1.0 + slopeAvg * 0.8` | 1.0 - 1.8 | Mountains increase cost |
| Friction | `1.0 + frictionAvg * 0.6` | 1.0 - 1.6 | Forests/rough terrain increase cost |
| Uphill | `1.0 + uphillMeters / 500` | 1.0 - ~2.0 | Elevation gain penalty |
| River | `maxRiverPenalty * 0.5` | 0 - 0.5 | River crossing additive penalty |

### 2.3 Column Rate by Faction

| Faction | heavyShare | Column Rate | Effective hops/turn (road) | Effective hops/turn (mountains) |
|---------|-----------|------------|---------------------------|--------------------------------|
| RS (VRS) | ~0.080 | 2 budget/turn | 2-3 | ~1 |
| HRHB (HVO) | ~0.034 | 3 budget/turn | 3-4 | 1-2 |
| RBiH (ARBiH) | ~0.011 | 4 budget/turn | 4-5 | 1-2 |

### 2.4 Transit Lifecycle

1. Bot AI writes column march order: `{ destination_sids: [target], stance: 'column' }`
2. `processOsidColumnMovement()` detects `stance: 'column'`, computes Dijkstra path through friendly OSIDs
3. Sets `brigade_movement_state`: `{ status: 'in_transit', stance: 'column', turns_remaining, path }`
4. Each turn, Pass 1 decrements `turns_remaining`; brigade skips bot orders while in transit
5. On arrival (`turns_remaining <= 0`): sets `location_osid` to destination, resets entrenchment, deletes movement state

---

## 3. Bot Column March Orders (Part 4)

### 3.1 Modified File: `src/sim/phase_ii/bot_brigade_ai_osid.ts`

**New helpers:**

| Function | Purpose |
|----------|---------|
| `computeHopsToFront()` | BFS through friendly territory to count hop distance to nearest OSID with enemy neighbors |
| `findFrontDestinationForColumnMarch()` | BFS to find actual front-line OSID as column destination; prioritizes undefended > critical > threatened > active front OSIDs |

**New constant:** `COLUMN_MARCH_MIN_HOPS = 3` — minimum distance from front to issue column march instead of 1-hop movement.

**Changes to `OsidBotOrdersResult`:** Added `column_march_orders: Record<FormationId, Osid>` field.

**Logic (all 3 faction AIs):**
- In-transit brigades filtered out via `isBrigadeDeployed()` — skip order generation entirely
- For each interior brigade: compute BFS hops to front
- If `hopsToFront >= 3`: find front destination, issue column march order
- If `hopsToFront < 3`: issue normal 1-hop deployed movement order (existing behavior)
- Column march orders written to `brigade_movement_orders` with `stance: 'column'`

### 3.2 Modified File: `src/sim/turn_pipeline.ts`

Added `osid-column-movement` pipeline step that calls `processOsidColumnMovement()`.

**Critical pipeline ordering:** Column movement runs BEFORE `zoc-constrained-movement`. This is essential because `applyZocConstrainedMovement()` clears all `brigade_movement_orders` (line 108: `state.brigade_movement_orders = undefined`). Column step consumes only `stance: 'column'` orders; ZoC movement then processes remaining regular orders.

---

## 4. Bug Found & Fixed During Implementation

### 4.1 Pipeline Ordering Bug

**Symptom:** 0 column transits across all 52 weeks despite column orders being generated.

**Root cause:** Initial pipeline order placed `osid-column-movement` AFTER `zoc-constrained-movement`. The ZoC step clears ALL `brigade_movement_orders` (including unprocessed column march orders) before the column step could read them.

**Fix:** Swapped pipeline order: `osid-column-movement` runs BEFORE `zoc-constrained-movement`.

---

## 5. Verification

### 5.1 Unit Tests: `tests/osid_column_movement.test.ts` (18 tests)

| Test Group | Count | Coverage |
|------------|-------|----------|
| averageTerrainForOsid | 2 | Default scalars for unmapped OSID; averaging across canonical SIDs |
| getOsidEdgeMovementCost | 3 | Flat/cheap edges; mountain/expensive edges; uphill > downhill asymmetry |
| getOsidColumnRate | 3 | Heavy mech = 2; light infantry = 4; mixed = 3 |
| dijkstraFriendlyPath | 4 | Friendly path found; blocked by enemy territory; same source/dest; terrain preference |
| processOsidColumnMovement | 6 | Start transit; advance existing; arrive at destination; blocked path; ignore non-column orders; 1-turn delay for new orders |

### 5.2 52-Week Scenario Run

| Metric | Value |
|--------|-------|
| Column starts (weeks 3-9) | 7 RS brigades |
| Transit times | 1-2 turns |
| Origin areas | Bosanska Gradiska, Laktasi (deep rear) |
| Destination areas | Prijedor, Bosanska Krupa, Teslic (front) |
| Determinism hash | `fad6379913c0ea73` (verified on consecutive runs) |

### 5.3 Full Test Suite

| Suite | Result |
|-------|--------|
| TypeCheck (`npx tsc --noEmit`) | Clean |
| Vitest (154 tests) | All pass |
| Node:test | All pass |
| Column movement tests (18) | All pass |
| Golden baselines | Updated |

---

## 6. Files Changed

| File | Change Type | Description |
|------|------------|-------------|
| `src/sim/phase_ii/osid_column_movement.ts` | **Created** | Core column movement module: terrain costs, Dijkstra, transit processing |
| `src/sim/phase_ii/bot_brigade_ai_osid.ts` | Modified | Column march logic for interior brigades >= 3 hops from front, in-transit filtering |
| `src/sim/turn_pipeline.ts` | Modified | Added `osid-column-movement` pipeline step before ZoC movement |
| `tests/osid_column_movement.test.ts` | **Created** | 18 unit tests covering all column movement functions |
| `docs/PROJECT_LEDGER.md` | Modified | Appended implementation entry |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Modified | Added item 9: OSID terrain-weighted column movement |
| `data/derived/scenario/baselines/manifest.json` | Modified | Updated golden baseline hash |

## 7. Existing Code Reused

| Function | Source | Usage |
|----------|--------|-------|
| `buildOsidAdjacency()` | `zoc.ts` | OSID adjacency graph for Dijkstra |
| `getTerrainScalarsForSid()` | `terrain_scalars.ts` | Canonical SID terrain lookup |
| `getPoliticalControllerOSID()` | `settlement_control.ts` | Friendly territory check in Dijkstra |
| `ensureBrigadeComposition()` | `equipment_effects.ts` | Lazy-init composition for rate calculation |
| `isBrigadeDeployed()` | `zoc.ts` | Filter out in-transit brigades from bot AI |
| `strictCompare()` | `validateGameState.ts` | Deterministic sorting/tie-breaking |
| `OperationalToCanonicalReverseMap` | `operational_data.ts` | OSID-to-canonical-SID mapping for terrain aggregation |

## 8. Determinism Impact

**Determinism preserved.** All new code uses:
- Sorted iteration via `strictCompare` for formation processing order
- Dijkstra with deterministic tie-breaking (OSID sort order)
- No `Math.random()`, no timestamps, no Set/Map iteration order dependencies
- Verified: consecutive 52-week runs produce identical hash `fad6379913c0ea73`
