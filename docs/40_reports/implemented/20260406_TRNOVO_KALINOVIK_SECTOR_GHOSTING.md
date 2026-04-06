# Trnovo/Kalinovik Sector Ghost and Territory Overlap Fix
Date: 2026-04-06
Run: n1350 (hash: 242d63cb30b1d1b8)
Status: CLOSED

## Mission Summary

`sector:arbih_1st_corps:3` persisted every run with 9 undefended front edges, zero brigades, and territory OSIDs spanning the Trnovo and Kalinovik areas. Three interlocking bugs caused the ghost: the sector survived all rescue and prune paths due to a combination of merge-guard immunity and a prune condition that required empty territory; simultaneously, `assignTerritoryVoronoi` was duplicating front-edge OSIDs (`kijevo_2`, `trnovo`, `tusila`) across both sector:2 and sector:3, causing sector:2 brigades to appear as phantom defenders of territory they did not own. Two targeted fixes — exclusive Voronoi ownership by edge count and an extended zero-brigade prune — eliminated the ghost, removed all territory duplication, and correctly yielded `op:kalinovik:golubici_2` to VRS by w40.

## Root Causes

### Bug 1 — Ghost Sector Survival

`splitNonContiguousSectors` splits a parent sector (sector:2, Hadžići-based) into children when its OSIDs are geographically disconnected. The Trnovo front is physically separate from the Sarajevo main front, so the split child (sector:3) is born with 9 front edges but zero brigade assignments.

Four independent prune/rescue paths all fail to remove it:

- **Lane B pre-pass in `ensureMinimumSectorCoverage`**: The 102nd and 17th Brigades from sector:2 are frontline-essential (their `friendly_osids` land on donor-sector front edges, flagged in `donorFrontOsids`). The pre-pass correctly declines to transfer them — no donors available.
- **Step 2 surplus transfer**: All six sector:2 brigades are committed to their own front; surplus count is zero. No transfer fires.
- **`mergeSmallAdjacentSectors` guard**: The function contains `if (a.assigned_brigade_ids.length === 0) continue` — it explicitly skips sectors with zero assigned brigades. Sector:3 is therefore never a merge candidate.
- **Final territory prune**: The original condition required `territory_osids.length === 0 AND assigned === 0 AND reserve === 0`. Sector:3 had 4 territory OSIDs (non-empty), so the prune never fired.

### Bug 2 — Territory Overlap (Shared Front-Edge OSIDs)

Both sector:2 and sector:3 list `kijevo_2`, `trnovo`, and `tusila` in their `sub_segments.friendly_osids` — they are legitimate front-edge anchors for both sectors after the split. `assignTerritoryVoronoi` detected these as `sharedClaims` and, per the previous logic, added them to **all** claiming sectors. This produced identical entries in the `territory_osids` arrays of both sector:2 and sector:3.

### Bug 3 — Artifact-Driven Frontage Durability

Because `kijevo_2`, `trnovo`, and `tusila` appeared in sector:2's `territory_osids`, the six sector:2 brigades (Hadžići-homed units) were counted as defenders for those OSIDs in combat evaluation. VRS pressure on the Trnovo front was absorbed by phantom defensive coverage that no brigade was actually providing. This inflated ARBiH resilience in the Trnovo area and masked the severity of the ghost sector from calibration.

## Fixes Implemented

### Fix 1: Voronoi Exclusive Territory (`sector_territory.ts`)

`assignTerritoryVoronoi` lines 392–411: when an OSID appears in `sharedClaims` (claimed by two or more sectors via `sub_segments.friendly_osids`), it is now assigned exclusively to the sector with the highest `length_edges` count. The reasoning: more front edges indicates the sector has greater operational surface and a stronger legitimate claim to the contested OSID. Equal-edges tiebreaker uses `strictCompare` on `sector_id` (lower ID wins) to preserve determinism. OSIDs no longer appear in more than one sector's `territory_osids`.

### Fix 2: Extended Zero-Brigade Prune (`corps_front_sectors.ts`)

Final prune block, lines 587–590: added a second condition independent of territory size:

```
if (s.assigned_brigade_ids.length === 0 && s.reserve_brigade_ids.length === 0) return false;
```

This fires after all rescue attempts have been exhausted. A sector with no assigned and no reserve brigades is pruned regardless of how many territory OSIDs or front edges it holds. The ghost sector meets this condition every run and is correctly removed.

## Verification

- `sector:arbih_1st_corps:3`: now a healthy populated sector — 6 brigades, 19 edges, 11 territory OSIDs (Hadžići + Trnovo area)
- `op:kalinovik:golubici_2`: RS-controlled by w40 (correctly captured by VRS; previously phantom-defended)
- Territory overlap: gone — `kijevo_2`, `trnovo`, `tusila` are exclusive to one sector
- n1350: 93.6% area-weighted (−0.4pp vs n1349, within calibration noise), 27/27 anchors PASS, 6/6 benchmarks PASS
- hash: 242d63cb30b1d1b8

## Residual Risks

- **`kijevo_2` (painted=RS, sim=RBiH)**: Previously phantom-defended by sector:2 overlap; now genuinely defended by sector:3 brigades. The position is legitimate and structurally defensible. May warrant future calibration attention if kijevo_2 anchor is added.
- **Zero-brigade prune is now aggressive**: Any sector that cannot be staffed after all rescue attempts is pruned. Watch for cases where a sector should be staffed but is temporarily empty due to timing (e.g., brigades in transit during a sector split turn). The prune fires at the end of sector construction; brigades in column march are not assigned. This is an accepted trade-off: a zero-brigade sector with real front edges causes more damage as a ghost than as a pruned entry.
- **SARAJEVO region at 79.1%**: Pre-existing under-performance, not caused or worsened by this session. Tracking needed.
