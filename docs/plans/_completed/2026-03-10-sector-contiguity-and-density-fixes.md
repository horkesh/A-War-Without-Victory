# Plan: Sector Contiguity & Density Fixes

**Date:** 2026-03-10
**Trigger:** War-or-Game sector audit of n528 (turn 40)
**Status:** Fix 1 IMPLEMENTED (n532). Fixes 2-5 remain open.

---

## Findings

### F1: Non-contiguous sectors — 2nd Corps "Kakanj, Kladanj" sector spans enemy territory

**What:** `sector:arbih_2nd_corps:8` had 25 front edges spanning Zavidovići/Maglaj (north) and Kakanj/Olovo/Vareš (south). An RS salient separated the two clusters on the map. Visually and operationally, these were two distinct fronts pretending to be one sector.

**Root cause:** `buildEdgeAdjacency()` connected front edges when their **friendly-side** OSIDs were polygon-adjacent, using a raw OSID adjacency walk. This walk didn't follow the front line — it walked through adjacent friendly territory regardless of whether the front itself was continuous. Two front edges at adjacent friendly OSIDs (hajderovici_2 and vukanovici) were connected even though they faced opposite sides of an RS salient, because the polygon adjacency showed them as neighbors at a 3m distance_contact point.

**Corrected diagnosis (n532):** The initial theory was that the walk leaked through enemy OSIDs. Investigation proved the friendly OSIDs ARE directly adjacent (distance_contact, 3.2m). The real problem was that the adjacency walk connected edges through INTERIOR friendly territory instead of following the FRONT LINE. Two front edges should only be connected if they meet at a **triple junction** — a point where three mutually adjacent polygons (two hostile OSIDs + shared friendly, or two friendly + shared hostile) create a corner of the front line.

### F2: `buildEdgeAdjacency` OSID adjacency walk replaced with triple-junction connectivity (FIXED n532)

**Old approach (broken):**
1. Group edges by friendly-side OSID
2. Connect edges at same friendly OSID (correct but too broad)
3. Connect edges at adjacent friendly OSIDs (walks through interior — BUGGY)

**New approach (n532 — front-line-following):**
Two front edges are adjacent on the front line iff they meet at a polygon triple junction:
- **Case A:** Same friendly OSID, hostile OSIDs adjacent → triple junction (F, H₁, H₂)
- **Case B:** Same hostile OSID, friendly OSIDs adjacent → triple junction (F₁, F₂, H)

This follows the front line itself. No walking through interior territory.

**Changes made:**
- `buildEdgeAdjacency()`: Replaced `connectEdgesAtSameAndAdjacentOsids` with triple-junction logic when faction+osidAdjacency provided. Fallback to shared-OSID-only for decompose/bisect paths.
- `splitNonContiguousSectors()`: Replaced same-OSID + adjacency-walk with triple-junction logic (Case A + Case B).
- `isSegmentAdjacent()`: Replaced BFS-through-friendly-territory with triple-junction edge-pair check. Parses edge IDs to extract friendly/hostile sides.

**Results (n532 vs n528):**
- Sectors: 52 → 77 (finer-grained, better-scoped)
- Max sector size: 24 edges (no mega-sectors)
- 2nd Corps Zavidovići (sector:4, 5 edges) now SEPARATE from Kakanj (sector:3, 12 edges)
- Area-weighted match: 87.0% (was 86.9% at n403)
- RS delta: -19 (was +104 at n482 — closer to historical)
- Bot benchmarks: 5/6 PASS (RS w20 failed at -8.7% deviation)
- All 441 tests pass

### F3–F7: Unchanged from original findings

See original findings below. These remain open.

### F3: HVO Central Bosnia — ghost front (13 edges, 0 brigades, 7 unassigned)

HVO central Bosnia enclaves surrounded by ARBiH/RS territory. Brigade classification BFS can't reach sector fronts through friendly territory. 7 HVO brigades (10,385 personnel) unassigned.

### F4: Density imbalance systemic across all factions

15-16x intra-corps density ratios. `equalizeSectorDensity` not redistributing effectively.

### F5: Destroyed formations still in state

5+ RBiH brigades at 0 personnel polluting sector assignment.

---

## Fix Plan

### Fix 1: Triple-junction front-line-following ✅ DONE (n532)

Replaced OSID adjacency walk with front-line-following triple-junction connectivity in `buildEdgeAdjacency`, `splitNonContiguousSectors`, and `isSegmentAdjacent`.

### Fix 2: Verify Step 3c handles newly-disconnected components

After Fix 1, `consolidateIsolatedCorpsPockets` should detect more disconnected edge components. **Needs verification** — check if the Kakanj edges moved to 3rd Corps or stayed as small 2nd Corps sectors.

### Fix 3: HVO enclave sector assignment (P2)

Add last-resort enclave assignment in `classifyBrigadesByTerritory`.

### Fix 4: Density equalization debugging (P1)

Investigate why `equalizeSectorDensity` isn't working.

### Fix 5: Remove destroyed formations from state (P3)

Dissolve 0-personnel formations after multiple turns.

---

## Execution Order

1. ✅ **Fix 1** (critical) — Triple-junction connectivity. DONE.
2. **Fix 2** (verify) — Check Step 3c results.
3. **Fix 4** (investigate) — Debug density equalization.
4. **Fix 3** (P2) — HVO enclave assignment.
5. **Fix 5** (P3) — Clean up destroyed formations.
