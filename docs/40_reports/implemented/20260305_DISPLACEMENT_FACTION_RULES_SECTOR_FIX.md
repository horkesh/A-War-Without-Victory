# Displacement Faction Rules + Corps Sector OSID-Adjacency Fix

**Date:** 2026-03-05
**Commits:** `c915ce0` (displacement), `7f83366` (sectors)
**Baseline:** n67 (pre-faction rules, pre-sector fix)
**Result:** n74 (post-all fixes)

## Summary

- Implemented per-faction displacement fractions and front-adjacency gating for war-start OSID seeding, correcting the historical pattern of Bosniak displacement (previously RS territory showed only 897k; now structurally correct).
- Fixed corps front sector over-fragmentation: 255 → 150 sectors, mean edge size 2.1 → 8.6, tiny sectors 242 → 53, empty sectors 99 → 27.
- Fixed a pre-existing brigade duplication bug in Phase 1E midpoint splits, surfaced by larger sectors.

---

## Changes Made

### 1. Per-Faction Displacement Fractions (displacement_takeover.ts)

**Problem:** All faction pairs used the flat `INITIAL_DISPLACEMENT_FRACTION = 0.70` for war-start OSID seeding. This caused deep-rear RBiH-controlled OSIDs to seed Serb displacement timers even for populations hundreds of km from any front, artificially inflating RBiH-sourced displacement.

**Solution:** Added `getInitialDisplacementFraction(toFaction, fromFaction, munId, isFrontAdjacent)` helper returning a per-faction fraction or `null` (skip seeding):

| Controller | Displaced | Fraction | Gate |
|---|---|---|---|
| HRHB | RS (Serbs) | **100%** | None — every HRHB OSID |
| RBiH | RS (Serbs) | **10%** | Sarajevo urban only |
| RBiH | RS (Serbs) | **50%** | Front-adjacent OSIDs only |
| RBiH | RS (Serbs) | **skip** | Deep-rear, non-Sarajevo |
| Default | Any | **70%** | None |

**Sarajevo urban:** `centar_sarajevo`, `novi_grad_sarajevo`, `novo_sarajevo`, `stari_grad_sarajevo`, `ilidza`, `vogosca`, `hadzici`.

**Front-adjacency:** Built from `state.war_front_edges_osid` (a/b are OSIDs). Fallback: all OSIDs treated as front-adjacent if no front edges computed yet (turn 1).

**Files changed:**
- `src/state/displacement_takeover.ts` — new constants (`HRHB_SERB_EXPULSION_FRACTION`, `RBIH_SERB_DISPLACEMENT_FRACTION`, `SARAJEVO_SERB_DISPLACEMENT_FRACTION`, `SARAJEVO_URBAN_MUN_IDS`), helper `getInitialDisplacementFraction`, `frontOsids` set built before Section 0, gating applied in Section 0 seeding and Branch A maturation.
- `docs/20_engineering/DISPLACEMENT_MASTER.md` — Step 0 description updated with per-faction table.

**Result (40w n67 → n74):**
- Total displacement: 1,339,614 → 1,060,492 (−21%)
- RBiH-controlled (Serbs expelled): 257,206 → 133,985 (−48%)
- RS-controlled (Bosniaks expelled): 1,046,847 → 896,873 (−14%)
- Ordering now historically correct: Bosniaks most displaced, Serbs from RBiH a distant second.

---

### 2. Corps Front Sector OSID-Adjacency Connectivity Fix (corps_front_sectors.ts)

**Problem:** `buildEdgeAdjacency` connected front edges only via shared OSID endpoints. Two front edges E1=(A,X) and E2=(B,Y) where A and B are adjacent OSIDs (but different) were treated as disconnected, fragmenting the front into single-edge islands. 255 sectors for 266 front edges, average 2.1 edges/sector, 242 tiny sectors (1–4 edges). `MIN_SECTOR_EDGES = 5` was defined but never enforced.

**Proposal A — OSID adjacency in edge connectivity:**
`buildEdgeAdjacency` now accepts `osidAdjacency?: Map<Osid, Osid[]>`. When provided, edges whose friendly-side OSIDs are OSID-adjacent are also connected. Threaded from `buildMultiSectorsForCorps` → `findSubSegments` → `buildEdgeAdjacency`.

**Proposal B — Merge undersized sub-segments:**
After `findSubSegments`, `mergeUndersizedSubSegments()` iteratively merges sub-segments below `MIN_SECTOR_EDGES` into their nearest OSID-adjacent neighbor. Isolated segments (enclaves, pockets with no adjacent neighbor) are kept as-is.

**Brigade dedup fix:**
Phase 1E midpoint splits can put a junction OSID (edges on both sides of split) into both halves' `friendly_osids`, causing a brigade to be double-assigned. `deduplicateBrigadesAcrossSectors()` removes the duplicate after Phase 1E, keeping the first sector in sorted order. Pre-existing bug made visible by larger sectors.

**Files changed:**
- `src/sim/combat/corps_front_sectors.ts` — `buildEdgeAdjacency` + `findSubSegments` signatures; new functions `isSegmentAdjacent`, `mergeSubSegmentsInto`, `mergeUndersizedSubSegments`, `deduplicateBrigadesAcrossSectors`; call sites updated.

---

## Scenario Results (40w n74 vs n67)

### Displacement
| Metric | n67 (before) | n74 (after) |
|---|---|---|
| Total displaced | 1,339,614 | 1,060,492 |
| RS-controlled expelled | 1,046,847 | 896,873 |
| RBiH-controlled expelled | 257,206 | 133,985 |
| HRHB-controlled expelled | 35,561 | 29,634 |
| Sustained trickle | 0 | 272,950 |

### Sector Structure
| Metric | Before | After |
|---|---|---|
| Total sectors | 255 | 150 |
| Mean edges/sector | 2.1 | 8.6 |
| Median edges/sector | 2 | 6 |
| Tiny (1–4 edges) | 242 (95%) | 53 (35%) |
| Good (5–25 edges) | 13 (5%) | 97 (65%) |
| Empty sectors | 99 | 27 |
| Brigade duplicates | 0 (masked) | 0 (verified) |

Notable per-corps improvement:
- VRS Sarajevo-Romanija: 25 → 5 sectors
- ARBiH 1st Corps: 18 → 4 sectors
- VRS Drina: 36 → 20 sectors (many genuine isolated pockets remain)

---

## Lessons Learned

- Front-adjacency for displacement seeding needs to be checked at seeding time, not just at maturation — if an OSID is in the deep rear at war start, it shouldn't get a timer at all.
- Edge connectivity in OSID-keyed graphs must use the OSID adjacency graph, not just shared OSID endpoints. Treating each OSID as isolated unless edges share the exact same OSID string is too strict for geographic contiguity.
- `MIN_SECTOR_EDGES` must be actively enforced with a merge pass — defining a constant without using it is a silent no-op.
- Phase 1E (brigade-count split) is safe only if junction OSIDs are deduplicated post-split. The bug existed before but was masked by tiny sectors never triggering it.

---

## Files Changed

| File | Change |
|---|---|
| `src/state/displacement_takeover.ts` | Per-faction fractions, front-adjacency gating, `getInitialDisplacementFraction` |
| `src/sim/combat/corps_front_sectors.ts` | OSID adjacency in edge connectivity, undersized merge, brigade dedup |
| `docs/20_engineering/DISPLACEMENT_MASTER.md` | Step 0 description updated |
| `docs/PROJECT_LEDGER.md` | Two entries appended |

## Next Steps

- GUI: sector visualization should now show meaningful front sections (5–25 edges) rather than single-edge fragments — verify in the map.
- Calibration: run full 52w to check displacement totals against historical (1.5–2M displaced by end of war) and sector-based bot behavior.
- The 53 remaining tiny sectors are genuine isolated fronts (Drina enclaves, Posavina pockets) — acceptable.
- HRHB 100% Serb expulsion may need validation against historical sources for specific municipalities.
