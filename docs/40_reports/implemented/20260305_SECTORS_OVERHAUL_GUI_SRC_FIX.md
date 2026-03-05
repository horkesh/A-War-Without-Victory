# Sectors Overhaul, GUI Brigade History, and SRC Officer Fix

**Date:** 2026-03-05
**Baseline:** n22 calibration (83.3% area-weighted); GUI Phase 5 complete; sectors built but non-contiguous
**Result:** Sector contiguity fixed; minimum coverage enforced; force-distribution directives added; SRC commander shows correctly

---

## Summary

- Fixed a geometric contiguity bug in the corps sector engine where front edges were grouped via shared *enemy* OSIDs, producing visually scattered sectors
- Hardened sector assignment: every sector is now guaranteed at least one assigned brigade; under-density sectors attract reinforcement via new bot directive fields
- Fixed Sarajevo-Romanija Corps (SRC) officer data — all six SRC-affiliated officers used the alias `vrs_srk` instead of the actual formation ID `vrs_sarajevo_romanija`, causing the SRC commander to never display in the OOB sidebar
- Surfaced brigade first-engagement data (`firstBattleTurn`/`firstBattleOsid`) from `BrigadeHistory` through the full stack: GameState → FormationView → GameStateAdapter → FormationDetail

---

## Changes Made

### 1. Sector Engine — Contiguity Fix (`corps_front_sectors.ts`)

**Root cause:** `buildEdgeAdjacency` connected front edges that shared *any* OSID endpoint — friendly or enemy. Two edges facing the same enemy OSID from geographically distant friendly OSIDs were grouped into one sub-segment, making sectors visually non-contiguous.

**Fix:** Added optional `faction` parameter to `buildEdgeAdjacency`. When provided, only groups edges via their **friendly-side** OSID endpoint. `findSubSegments` passes `faction`, ensuring sub-segments are connected through shared friendly territory only.

```typescript
// Before: edges connected via any shared OSID (friend or enemy)
const edgeAdj = buildEdgeAdjacency(edgeIds, edgeMeta);

// After: edges connected only via friendly-side OSID
const edgeAdj = buildEdgeAdjacency(edgeIds, edgeMeta, faction);
```

Callers `decomposeIntoConnectedComponents` and `splitSubSegmentAtMidpoint` do not pass faction — they operate on already-correct sub-segments and need full adjacency for midpoint splitting.

### 2. Sector Engine — Minimum Coverage (`corps_front_sectors.ts`)

**New function:** `ensureMinimumSectorCoverage()` — Step 7 of `buildFactionSectors`, runs after orphan assignment and reserve redistribution.

For each sector with `assigned_brigade_ids.length === 0`:
1. Promote first reserve to assigned (if available)
2. If no reserves: BFS from sector friendly OSIDs to find the nearest brigade in a **surplus** sector (>1 assigned) within the same corps, then transfer it

Grouped by corps; only transfers within the same corps. Deterministic sorted iteration.

### 3. CorpsDirective — New Fields (`game_state.ts`)

```typescript
/** Sector IDs that are under-density and need brigade reinforcement. */
reinforce_sector_ids?: string[];
/** Priority sector for offensive concentration (sector with most offensive targets). */
priority_sector_id?: string;
```

### 4. Bot Corps AI — Density Balancing + Priority Sector (`bot_corps_ai.ts`)

Before building the directive:
- **`reinforce_sector_ids`**: computes `targetDensity = totalCorpsBrigades / totalCorpsFrontEdges`; flags sectors with `actualDensity < targetDensity × 0.5`
- **`priority_sector_id`**: for `offensive`/`balanced` stances, identifies the sector with the most offensive targets in its `enemy_osids`

### 5. Bot Brigade AI — New Rules (`bot_brigade_ai_osid.ts`)

**Rule 5c** (between Rule 5b and Rule 6): If this brigade is at a stacked front OSID (≥2 friendly brigades here) and the directive has `reinforce_sector_ids`, BFS-march to the nearest under-density sector.

**Rule 7 priority prefix**: Interior brigades check `priority_sector_id` first — if set and brigade is not already in that sector, BFS-march toward it (offensive concentration). Falls through to normal Rule 7 if path is risky or unreachable.

### 6. SRC Officer Data Fix (`data/scenarios/officers/apr1992_officers.json`)

All six SRC-affiliated officers used `"vrs_srk"` as `home_corps_id`, `historical_corps_id`, or `compatible_corps_ids`. The actual formation ID is `"vrs_sarajevo_romanija"`. This caused `OOBSidebar`'s commander lookup (`assigned_corps_id === corpsId`) to never match, so no commander ever displayed for SRC.

**Fixed all six entries:**
- `vrs_sipcic`: `home_corps_id` + `historical_corps_id`
- `vrs_galic`: `home_corps_id`
- `vrs_d_milosevic`: `home_corps_id`
- `vrs_sladoje`: `home_corps_id`
- `vrs_despotovic`: `compatible_corps_ids`
- `vrs_lizdek`: `home_corps_id`

### 7. GUI — Brigade First Engagement (`types.ts`, `GameStateAdapter.ts`, `FormationDetail.tsx`)

`BrigadeHistory` already stored `first_battle_turn` and `first_battle_osid` in the sim, but they were never exposed in the UI.

- **`types.ts`**: Added `firstBattleTurn?: number | null` and `firstBattleOsid?: string | null` to `FormationView`
- **`GameStateAdapter.ts`**: Extracts from `brigadeHistoryRecord[id]` for brigade/OG formations
- **`FormationDetail.tsx`**: Displays "First engagement: T{turn} @ {osid}" in Brigade History section; also surfaces `total_casualties_taken`, estimated KIA/WIA, and `total_casualties_inflicted`

---

## Refactor Pass

Applied after implementation:
- **Rule 5c**: three-level nested `if` → flat `if`-and-chain; ugly suffix variable names (`factionHere5c`, `targetOsids5c`, `dest5c`) → plain names via flattened scope
- **Rule 7 priority**: redundant `&& state.corps_front_sectors` guard → `state.corps_front_sectors?.[...]` optional chaining
- **`ensureMinimumSectorCoverage` BFS**: `seeds` array + separate loop → `const visited = new Set(queue)` one-liner

---

## Test Results

- `npx tsc --noEmit` (root): clean
- `npx tsc --noEmit` (src/ui/map): clean
- `npm run test:vitest`: **24/24 files, 296/296 tests passed, 1 skipped** (unchanged baseline)
- Note: `sector_offensive.test.ts` (node:test format) has one pre-existing failure unrelated to these changes — confirmed by checking out the state before changes

---

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/corps_front_sectors.ts` | `buildEdgeAdjacency` faction-aware; `ensureMinimumSectorCoverage` added; Step 7 call in `buildFactionSectors` |
| `src/sim/combat/bot_corps_ai.ts` | Density balancing + priority sector computation before directive construction |
| `src/sim/combat/bot_brigade_ai_osid.ts` | Rule 5c (sector reinforcement); Rule 7 priority prefix (offensive concentration) |
| `src/state/game_state.ts` | `CorpsDirective.reinforce_sector_ids` and `priority_sector_id` fields |
| `data/scenarios/officers/apr1992_officers.json` | All 6 SRC officers: `vrs_srk` → `vrs_sarajevo_romanija` |
| `src/ui/map/data/types.ts` | `FormationView.firstBattleTurn`, `firstBattleOsid` fields |
| `src/ui/map/data/GameStateAdapter.ts` | Extract `first_battle_turn`/`first_battle_osid` from `brigadeHistoryRecord` |
| `src/ui/map/components/FormationDetail.tsx` | Brigade history section: first engagement, total losses, enemy losses |

---

## Next Steps

- Run 40w calibration to confirm sector contiguity fix has no regression (sectors previously merged via enemy OSIDs will now split into smaller components — force distribution may shift)
- Verify SRC commander display in OOB sidebar with a loaded save
- Consider `priority_sector_id` only fires when corpsSectors.length > 1 (single-sector corps already have all brigades in one sector — the current code would still compute it, but it's a no-op for single-sector corps)
- Full GUI Phase 6 scope definition (brigade detail enhancements, sector visualization panel refinements)
