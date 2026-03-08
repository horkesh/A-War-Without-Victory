# Sector Reclassification, Pre-Planned Ops Expansion, Warroom Regions, and Simplify Pass

**Date:** 2026-03-08
**Baseline:** bdead5f (corps intelligence commit)

## Summary

- **Corps front sectors**: Added post-equalization `reclassifyRearBrigades` step that demotes deep-rear assigned brigades to reserve (capped 1-2 per sector). Removed hostile-side adjacency bridging from `splitNonContiguousSectors` (~90 lines of O(E²) logic). Ghost sector pruning tightened.
- **Pre-planned operations**: Expanded from VRS-only to VRS + ARBiH. Added Operation Corridor (1KK multi-axis) and Operation Teočak (ARBiH, deferred to w14). Added `faction` field to `PrePlannedOp`, `available_from` gating, and queued operation chaining (Prijedor → Corridor → Bosanski Novi).
- **Warroom**: Faction-specific clickable region loading, canonical anchor→modal mapping table in WARROOM_MASTER, removed stale `hq_clickable_regions.json`.
- **GUI**: CombatSummaryPanel redesign with casualties/victories stats. Removed unused ArmyDetail and CorpsDetail components.
- **Simplify pass**: Extracted `isEligibleOperationFormation` to shared `formation_constants.ts` (was duplicated in `pre_planned_operations.ts` and `triggered_operations.ts`). Extracted `buildAxesFromDef` + `buildCorpsOperation` helpers (~50 lines of dedup). Fixed `available_from: 0` falsy bug. Removed dead import.

## Changes Made

### Corps Front Sectors (`corps_front_sectors.ts`)
- **New Step 8**: `reclassifyRearBrigades()` — after equalization and coverage, demotes assigned brigades not on front OSIDs or 1-hop behind to reserve. Reserve cap: 1 for ≤10 edges, 2 for >10 edges.
- **Removed hostile-side adjacency bridging**: `splitNonContiguousSectors` simplified to friendly-side-only adjacency. Removed ~90 lines of hostile OSID component analysis that caused non-contiguous sectors wrapping around enemy territory.
- **Removed `allFactionFriendlyOsids` parameter** from `splitNonContiguousSectors`.
- **Coverage fallback (Step 3)**: Added fallback that takes any brigade from highest-surplus donor when no non-front brigade available.
- **Ghost sector pruning**: Changed filter from `length_edges > 1 || territory_osids.length > 0` to `length_edges > 0`.
- Cross-corps reserve fallback removed (brigades 1-hop behind another corps's front now BFS to own corps sector instead).

### Pre-Planned Operations (`pre_planned_operations.ts`)
- Added `faction: FactionId` field to `PrePlannedOp` interface (was hardcoded 'RS').
- Added `available_from?: number` field for deferred operations.
- Added Operation Corridor (1KK, 2 axes: Corridor East + Corridor South).
- Added ARBiH Operation Teočak (2nd Corps, deferred to w14).
- Queued operations expanded: 1KK chain is now Prijedor → Corridor → Bosanski Novi.
- Deferred ops queue logic: ops with `available_from` are queued for their corps if not directly injected.
- Fixed brigade ID: `rs_2nd_posavina` → `rs_2nd_posavina_light_infantry`.
- Changed from own-corps-only to cross-corps brigade eligibility for pre-planned ops (historical accuracy).
- `injectQueuedOperation`: now retries gated ops (keeps queue entry) instead of consuming and discarding.

### Simplify Fixes
- **Extracted `isEligibleOperationFormation`** to `src/state/formation_constants.ts` — shared by `pre_planned_operations.ts` and `triggered_operations.ts`.
- **Extracted `buildAxesFromDef` + `buildCorpsOperation`** helpers — eliminated ~50 lines of duplication between `injectPrePlannedOperations` and `injectQueuedOperation`.
- **Fixed `available_from: 0` falsy bug** — truthiness checks → `!= null` (2 locations + 1 deferred-queue guard).
- **Removed unused `getFormationCorpsId` import**.

### Sector Offensive (`sector_offensive.ts`)
- Added axis-level aggregation: sums `objective_capture_count` and `attack_attempt_count` from axes to operation for backward compatibility.

### Sector Rearrangement (`sector_rearrangement.ts`)
- Minor adjustments to sector rearrangement logic.

### Serialization (`serializeGameState.ts`)
- Added `turn_summaries` to `GAMESTATE_TOP_LEVEL_KEYS` whitelist.

### GUI
- **CombatSummaryPanel**: Redesigned with casualties and victories statistics display.
- **Removed ArmyDetail.tsx** and **CorpsDetail.tsx** (unused components).

### Warroom (`warroom.ts`)
- Added `ensureRegionsLoadedForFaction()` for faction-specific clickable region files.
- Added `loadInitialRegions()` with candidate URL fallback chain.
- Added `resolveRegionsUrl()` for override URL support.

### Warroom Docs (`WARROOM_MASTER.md`)
- Added canonical anchor→modal mapping table (8 anchors: wall_flag_area, desk_map, wall_calendar_area, command_briefing_folio, newspaper_stack, intelligence_journal, diplomatic_telephone, desk_radio).
- Flag rendering directive: must hang down from pole, not flat/pinned.

### Deleted Files
- `data/ui/hq_clickable_regions.json` — superseded by per-faction region files.
- `src/ui/warroom/public/data/ui/hq_clickable_regions.json` — duplicate.

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/corps_front_sectors.ts` | +60/-90: reclassifyRearBrigades, simplified splitNonContiguous |
| `src/sim/combat/pre_planned_operations.ts` | +150/-160: faction field, Op Corridor, Op Teočak, shared helpers |
| `src/sim/combat/triggered_operations.ts` | +3/-6: shared isEligibleOperationFormation |
| `src/sim/combat/sector_offensive.ts` | +10: axis aggregation |
| `src/sim/combat/sector_rearrangement.ts` | +5/-5: minor adjustments |
| `src/state/formation_constants.ts` | +6: isEligibleOperationFormation |
| `src/state/serializeGameState.ts` | +2: turn_summaries key |
| `src/ui/map/components/CombatSummaryPanel.tsx` | +25/-25: redesign |
| `src/ui/map/components/ArmyDetail.tsx` | -47: deleted |
| `src/ui/map/components/CorpsDetail.tsx` | -47: deleted |
| `src/ui/warroom/warroom.ts` | +50/-38: faction region loading |
| `docs/40_reports/WARROOM_MASTER.md` | +40/-10: anchor mapping table |
| `tests/pre_planned_operations.test.ts` | +15/-11: updated for faction field + new ops |
| `tools/ui/warroom_stage_assets.ts` | +5: faction region file staging |

## Next Steps

- Run 40w calibration to verify sector reclassification + pre-planned ops don't regress match rate
- Validate Operation Corridor and Teočak trigger timing in scenario runs
- Complete warroom faction-specific region JSON files for all three factions
