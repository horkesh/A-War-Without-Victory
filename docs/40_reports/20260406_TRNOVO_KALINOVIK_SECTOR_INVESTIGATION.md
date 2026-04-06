# Trnovo-Kalinovik Sector Ownership — Phase 1 Investigation
## First-Principles Root Cause Report

**Date:** 2026-04-06  
**Status:** INVESTIGATION COMPLETE — Awaiting architect decision on Phase 2 (fix)  
**Based on:** n1349 final save (`data/derived/latest_run_final_save.json`)  
**tsc/vitest:** n/a — read-only investigation

---

## 1. Verified Sector State (n1349 end-of-run)

### sector:arbih_1st_corps:2
```
corps_id: arbih_1st_corps
assigned_brigade_ids: [102nd_motorized, 109th_mountain, 17th_muslim_light,
                       181st_mountain, 182nd_vitezka_light, hvo_kralj_tvrtko]
reserve_brigade_ids: [104th_vitezka_motorized]
length_edges: 12
sub_segment friendly_osids: [binjezevo, hadzici, lokve, tarcin_2,
                              kijevo_2, trnovo, tusila]
territory_osids: [binjezevo, budmolici, hadzici, lokve, luke, pazaric,
                  tarcin_2, bukovica, kijevo_2, trnovo, tusila]  (11 total)
enemy sub_segment: [misevici_2, kasindo, rakovica_2]
```

### sector:arbih_1st_corps:3 ← THE GHOST
```
corps_id: arbih_1st_corps
assigned_brigade_ids: []        ← ZERO BRIGADES
reserve_brigade_ids: []         ← ZERO RESERVES
length_edges: 9                 ← REAL FRONT (9 edges undefended)
sub_segment friendly_osids: [golubici_2, kijevo_2, trnovo, tusila]
territory_osids: [golubici_2, kijevo_2, trnovo, tusila]
enemy sub_segment: [obalj, vlaholje (Kalinovik RS), glavaticevo_2 (Konjic RS)]
```

### sector:arbih_4th_corps:0 ← TRANSIENT ARTIFACT
```
corps_id: arbih_4th_corps
assigned_brigade_ids: [arbih_444th_mountain]
length_edges: 5
territory_osids: [delijas]
enemy sub_segment: [mazlina (Foča), varos_2 (Kalinovik), lukavica (Novo Sarajevo)]
```

### OSID overlap (sector:2 ∩ sector:3)
| OSID | sector:2 | sector:3 | Cause |
|---|---|---|---|
| op:trnovo:kijevo_2 | sub_segment + territory | sub_segment + territory | Front junction (by design) |
| op:trnovo:trnovo | sub_segment + territory | sub_segment + territory | Front junction (by design) |
| op:trnovo:tusila | sub_segment + territory | sub_segment + territory | Front junction (by design) |
| op:kalinovik:golubici_2 | absent | sub_segment + territory | **BFS territory claim (bug seam)** |

Also: `op:pale:podgrab` appears in both sector:1 and sector:4 (same pattern — not investigated here).

---

## 2. Root Cause Chain: Why Sector:3 Has Zero Brigades

### Layer 1 — Sector creation: `splitNonContiguousSectors` (SMOKING GUN)

**File:** `src/sim/combat/sector_splitting.ts:276-292`

`splitNonContiguousSectors` splits a sector when its front edges span disconnected components. The Kalinovik front edges (with `golubici_2` as friendly OSID) and the main Hadzici-Trnovo front edges form separate edge-connected components within 1st Corps. The split creates:

```typescript
// Brigades: all go to the largest component; others get empty lists
// (classifyBrigadesByTerritory will re-populate after territory Voronoi)
const isLargest = ci === largestCompIdx;
...
assigned_brigade_ids: isLargest ? [...sector.assigned_brigade_ids] : [],  // line 291
reserve_brigade_ids:  isLargest ? [...sector.reserve_brigade_ids] : [],   // line 292
```

**The largest component (Hadzici-Trnovo front) = sector:2 → gets all brigades.  
The smaller component (Kalinovik front) = sector:3 → created with `assigned_brigade_ids: []`.**

The comment promises "classifyBrigadesByTerritory will re-populate after territory Voronoi" — but this **assumption fails** when no brigade is physically present in the smaller component's territory. All 6 potential brigades are in Hadzici area (sector:2 territory), not Kalinovik.

### Layer 2 — FIX 1 bypass

`buildFactionSectors` (corps_front_sectors.ts:421-424) should skip sectors where no corps brigade is in the same connected component:
```typescript
const sectorComp = getSectorComponent(sector, preComponentOf);
if (sectorComp !== -1 && !corpsBrigadeComponents.has(sectorComp)) continue;
```

`getSectorComponent` iterates `territory_osids` in sorted order:
1. `golubici_2` — if `golubici_2` is isolated (its only adjacency neighbors are RS-controlled), it may not appear in `componentOf` at all (BFS through friendly OSIDs never reaches it). If `componentOf.get('golubici_2') === undefined`, the check is skipped.
2. `kijevo_2` — IS in componentOf (main Sarajevo/Trnovo component, say #1).

Result: `getSectorComponent(sector:3)` returns component #1 (main Sarajevo block). `corpsBrigadeComponents.has(1)` = true → sector:3 passes FIX 1.

### Layer 3 — Brigade assignment failure (pre-pass)

`ensureMinimumSectorCoverage` pre-pass (brigade_assignment.ts:1268-1319) looks for brigades whose `location_osid` is in sector:3's territory AND not front-essential to their donor sector.

**All 6 sector:2 brigades are at front-essential OSIDs at end of run:**

| Brigade | location_osid | In S2 front? | In S3 territory? |
|---|---|---|---|
| 102nd_motorized | op:trnovo:trnovo | **YES** | YES (overlapping junction) |
| 109th_mountain | op:hadzici:binjezevo | YES | no |
| 17th_muslim_light | op:trnovo:trnovo | **YES** | YES (overlapping junction) |
| 181st_mountain | op:hadzici:lokve | YES | no |
| 182nd_vitezka_light | op:hadzici:hadzici | YES | no |
| hvo_kralj_tvrtko | op:hadzici:tarcin_2 | YES | no |

The two brigades at `trnovo` are both in sector:3's territory AND sector:2's front — the `donorFrontOsids.has(loc)` guard blocks them. The other four are in sector:2's front but not sector:3's territory. **Zero candidates for pre-pass donation.**

### Layer 4 — Brigade assignment failure (Step 2 component mismatch)

`ensureMinimumSectorCoverage` Step 2 (brigade_assignment.ts:1362) requires donors in the same connected component as sector:3:

```typescript
const sameCompSectors = corpsSectors.filter(s =>
    s.assigned_brigade_ids.length > 1
    && getSectorComponent(s, componentOf) === sectorComp)
```

`sectorComp` = component of `golubici_2` or `kijevo_2` depending on which is in `componentOf`. If `golubici_2` IS in `componentOf` as an isolated singleton (component #42), then `sectorComp = 42`. `getSectorComponent(sector:2)` = component of `binjezevo` = component #1 (main Sarajevo block). `42 ≠ 1` → sector:2 is NOT in `sameCompSectors` → **no donors**.

Even if `sectorComp = 1` (golubici_2 not in componentOf), the fallback transfer would be reversed by `enforcePhysicalSectorOwnership` (Step 8c, brigade_assignment.ts:1017-1060): a brigade transferred to sector:3 would have `location_osid` NOT in sector:3's territory/front/reserve zone → stripped.

### Layer 5 — Merge guard blocks fusion

`mergeSmallAdjacentSectors` (corps_front_sectors.ts:240-241):
```typescript
if (a.assigned_brigade_ids.length === 0) continue; // don't merge empty sectors
```
This guard **explicitly prevents sector:3 from being merged** into sector:2, even though they are adjacent (sharing `kijevo_2`, `trnovo`, `tusila` as common front OSIDs).

### Layer 6 — Final prune does not remove it

The ghost sector prune (corps_front_sectors.ts:582-588):
```typescript
if (s.territory_osids.length === 0
    && s.assigned_brigade_ids.length === 0
    && s.reserve_brigade_ids.length === 0) return false;
```
Sector:3 has `territory_osids.length = 4` → **survives the prune**.

**Result:** Sector:3 persists every turn with 9 undefended front edges and zero brigades.

---

## 3. Root Cause: sector:arbih_4th_corps:0 (delijas)

### Why 4th Corps has a sector at delijas

`mapOsidsToCorps` Phase 1b (sector_territory.ts:138-154):
- 444th Mountain Brigade (`corps_id: arbih_4th_corps`, `home_osid: jablanica_2`) has `location_osid: delijas` at sector construction time.
- `munFromOsid('delijas')` = `trnovo` municipality.
- `homeMunCorps.get('trnovo')` — NO 1st Corps brigade has a home in Trnovo municipality. All sector:2 brigades are homed in Hadzici or Centar municipality:

| Brigade | home_osid |
|---|---|
| 102nd_motorized | op:hadzici:binjezevo |
| 109th_mountain | op:hadzici:hadzici |
| 17th_muslim_light | op:hadzici:binjezevo |
| 181st_mountain | op:hadzici:lokve |
| 182nd_vitezka_light | op:hadzici:luke |
| hvo_kralj_tvrtko | op:centar_sarajevo:sarajevo_dio_centar_sajarevo |

The Phase 1b guard `if (munCorps && !munCorps.has(fCorpsId)) continue` is NOT triggered for Trnovo municipality → 4th Corps claims `delijas`. Front edges at `delijas` are partitioned to 4th Corps → `sector:arbih_4th_corps:0` is created.

### Is this a bug?

**No — it is a transient construction artifact.** The 444th is already ordered to march to `op:konjic:dzepi_2` (in the retroactive tooth eviction guard result). Next turn's sector construction will find no 4th Corps brigade at `delijas`, no Phase 1b claim → `delijas` returns to 1st Corps BFS territory → sector:0 dissolves.

The 444th is legitimately 4th Corps (home Jablanica). The retroactive eviction guard correctly identified `delijas` as a risky position and dispatched it home. The artifact is self-correcting.

---

## 4. Root Cause: Why golubici_2 is in 1st Corps Territory (Not 4th Corps)

`mapOsidsToCorps` Phase 2 BFS expands from locked home seeds:
- 1st Corps seeds: Hadzici area → BFS expands south through Trnovo municipality → reaches `kijevo_2`, `trnovo`, `tusila`, then one hop further: `golubici_2`
- 4th Corps seeds: Jablanica/Konjic → BFS expands northeast but must cross more hops to reach Kalinovik

**1st Corps BFS wins the race to `golubici_2`** because it seeds from Hadzici (geographically closer to Trnovo/Kalinovik than Jablanica is).

**However**, the actual brigades fighting at `golubici_2` are 4th Corps:
- 443rd Mountain Brigade (`corps_id: arbih_4th_corps`) defended `golubici_2` at turn 27
- 443rd is currently at `op:konjic:dzepi_2`, assigned to `sector:arbih_4th_corps:1`

`golubici_2` is claimed by 1st Corps via BFS but defended by 4th Corps brigades. The sector system sees this as a 1st Corps front with no 1st Corps brigades — permanent ghost.

The `CORPS_EXCLUDED_MUNICIPALITIES` map (sector_territory.ts:26-31) already uses this pattern for VRS corps:
```typescript
['vrs_sarajevo_romanija', new Set([
    'gorazde', 'rogatica', 'cajnice', 'kalinovik', 'foca', ...
])]
```
`kalinovik` is excluded from `vrs_sarajevo_romanija`. But there is no exclusion for `arbih_1st_corps` from `kalinovik`.

---

## 5. The 444th's Full Operational Narrative

| Turn | OSID | Role | Outcome | Notes |
|---|---|---|---|---|
| 5 | op:mostar:kruzanj_2 | defender | decisive_victory → retreat | Lost OSID (RS took it back) |
| 21 | op:kalinovik:sela_2 | defender | costly_victory | Held — becomes retroactive tooth |
| 27 | op:foca:mazlina | attacker | repulsed | From sela_2 area toward RS rear |
| 38 | op:trnovo:delijas | defender | stalemate | Evicted from sela_2 → routed to delijas |
| 40 | op:trnovo:delijas | defender | stalemate | Holding delijas under sustained RS pressure |
| — | op:konjic:dzepi_2 | (marching) | — | Retroactive eviction guard ordered march to 4th Corps home territory |

---

## 6. Answers to Architect Questions

**A. Why does sector:arbih_1st_corps:3 exist with zero brigades?**
Five-layer construction failure: (1) sector created for Kalinovik front edges, (2) FIX 1 bypassed via component fallthrough, (3) all 6 donor brigades are front-essential, (4) component mismatch blocks Step 2 transfer, (5) merge guard explicitly skips empty sectors. **The sector is a ghost: real front edges, zero defenders.**

**B. Why do kijevo_2, trnovo, tusila appear in both sector:2 and sector:3?**
By design — front-edge OSIDs at sector junctions belong to both sectors per `assignTerritoryVoronoi`. Not a bug. The bug is `golubici_2` (Kalinovik) being in 1st Corps territory at all.

**C. Why does sector:3 have zero brigades while sector:2 has 6?**
No 1st Corps brigade has a home in Trnovo or Kalinovik municipality. All 6 sector:2 brigades are homed in Hadzici/Centar. The brigades that actually fight at `golubici_2` are 4th Corps (443rd Mountain). Corps-boundary BFS assigns `golubici_2` to 1st Corps because Hadzici is geographically closer — but no 1st Corps brigade defends it.

**D. Is sector:arbih_4th_corps:0 (delijas) legitimate or artifact?**
Transient construction artifact. The 444th's physical presence at `delijas` caused Phase 1b to claim it for 4th Corps. The sector will dissolve next turn as the 444th marches home. Not a structural bug.

**E. Is delijas legitimate 4th Corps territory?**
No — `delijas` is in Trnovo municipality, historically 1st Corps front (Sarajevo south). The 444th ended up there as a consequence of tooth-eviction routing. The eviction guard correctly sent it away. The 4th Corps sector there is a run artifact.

---

## 7. Fix Seam Options

### Option A — Territorial exclusion (recommended investigation target)
Add `'kalinovik'` to `CORPS_EXCLUDED_MUNICIPALITIES` for `arbih_1st_corps` in `sector_territory.ts:26-31`.

**Effect:** 1st Corps BFS does not claim `golubici_2`. 4th Corps BFS (from Jablanica/Konjic seeds, via the 443rd) claims `golubici_2` instead. Sector for `golubici_2` front edges created under 4th Corps. The 443rd Mountain (already operating there) gets assigned.

**Risk:** `kalinovik` may contain other OSIDs that legitimately belong to 1st Corps front. Need to audit all `op:kalinovik:*` OSIDs and their controlling faction.

**Requires:** Historian input on canonical 1st vs 4th Corps boundary in Kalinovik municipality.

### Option B — Merge guard fix
Remove `if (a.assigned_brigade_ids.length === 0) continue;` from `mergeSmallAdjacentSectors` (corps_front_sectors.ts:240-241) or add a dedicated "absorb empty adjacent sectors" post-merge pass.

**Effect:** Sector:3 merges into sector:2. Sector:2 becomes responsible for the Kalinovik front. May or may not get additional brigades (depends on density calculation).

**Risk:** Assigns Kalinovik front responsibility to 1st Corps brigades homed in Hadzici — may be historically incorrect. Does not fix the underlying territorial claim bug.

### Option C — Ghost sector prune extension
Extend the final prune to also remove sectors with zero brigades AND no unique front OSIDs (all front OSIDs shared with other sectors).

**Effect:** Sector:3 is pruned (its front OSIDs `kijevo_2`, `trnovo`, `tusila` are all shared with sector:2; only `golubici_2` is unique but isolated). `golubici_2`'s front edges become uncovered by any sector.

**Risk:** Hides the underlying bug without fixing the territorial claim. `golubici_2` front would be uncovered — no sector claims responsibility for defending it.

---

## 8. Residual Questions for Architect Decision

1. **Historian needed**: Is the Kalinovik municipality historically 1st Corps or 4th Corps operational area? This determines whether Option A is correct. Specifically: were ARBiH 1st Corps brigades ever deployed to Kalinovik municipality, or was that entirely 4th Corps/6th Corps responsibility?

2. **443rd corps placement**: The 443rd Mountain Brigade (4th Corps) defended `golubici_2` at turn 27. Is this OOB-correct? Or was the 443rd historically a different corps?

3. **Merge guard reason**: The `if (a.assigned_brigade_ids.length === 0) continue` guard in `mergeSmallAdjacentSectors` was added deliberately. Was this to prevent a prior bug? Removing it may have unintended effects on other corps.

4. **podgrab duplicate**: `op:pale:podgrab` appears in both `sector:arbih_1st_corps:1` and `sector:arbih_1st_corps:4`. Same pattern as the Trnovo junction overlap. Is it also a zero-brigade ghost? Not investigated here.

---

## 9. Recommended Phase 2 Decision

**Do not patch yet.** The territorial exclusion (Option A) is the most structurally correct fix, but requires Historian validation of the 1st/4th Corps Kalinovik boundary. The ghost sector (Option B/C) is a downstream symptom of the territorial claim bug.

**If Historian confirms Kalinovik is 4th Corps territory:** Implement Option A (add `kalinovik` to 1st Corps exclusions). Run scenario. Verify 443rd/444th fill the Kalinovik sector. No calibration regression expected.

**If Historian confirms Kalinovik is contested/1st Corps:** Implement Option B (merge guard fix) + accept that sector:2 absorbs the Kalinovik front. Accept historical imprecision.
