# Brigade AoR (Sub-Segment Assignment) — Design Document

**Status:** DESIGN — ready for implementation
**Version Target:** v0.3.2
**Date:** 2026-03-15
**Prerequisite:** Reactive defense Layer A+B (v0.3.0 ✓), sub-segment system (v0.2.0 ✓)

---

## Summary

Assign each non-reserve brigade to a specific sub-segment of its sector front — their Area of Responsibility (AoR). When attacked, the assigned brigade provides primary defense while neighboring brigades contribute reactively via the existing distance-weighted system (Layer A).

This completes the reactive defense architecture. Layer A was designed for mutual support between assigned positions — but without per-brigade assignment, everything averaged to uniform defense. Adding AoR gives the front **tactical texture**: strong segments, weak segments, exploitable gaps, and meaningful brigade-to-ground identity.

---

## Current System

```
Attack on OSID X in sector S:
  defense = (sum of ALL brigade power in S) / (sector front edges)
  + reactive bonus (stance × home motivation)
  = UNIFORM defense across entire sector
```

Every OSID in the sector faces the same defense. No weak points. No strong points. Attackers can't find gaps.

---

## Proposed System

```
Attack on OSID X in sub-segment G (primary: Brigade A):
  defense = Brigade A power / G.front_edges              ← PRIMARY
          + Brigade B power × 0.60^hops / G.front_edges  ← REACTIVE (neighbor)
          + Brigade C power × 0.36^hops / G.front_edges  ← REACTIVE (2 hops away)
          + stance modifier
          + home motivation bonus
  = NON-UNIFORM defense — varies by sub-segment strength
```

Strong brigades on short segments = hard to crack. Weak brigades on wide segments = soft spots. Reactive defense ensures neighbors still help, preventing instant collapse.

---

## Worked Example

Sector with 3 brigades, 3 sub-segments (3 front edges each):

| Sub-Segment | Primary Brigade | Power | Primary/Edge | + Reactive | Total/Edge |
|-------------|----------------|-------|-------------|-----------|-----------|
| G1 | Brigade A (2000) | 2000 | 667 | +420 | **1087** |
| G2 | Brigade B (1500) | 1500 | 500 | +600 | **1100** |
| G3 | Brigade C (1000) | 1000 | 333 | +540 | **873** |

Current system: 500/edge everywhere. New system: 873-1100/edge with texture.

The attacker has a reason to probe G3 (weakest). But G3 isn't defenseless — reactive support provides 540 power from neighbors. A smart attacker concentrates on G3; a smart defender rotates Brigade C out and replaces with a stronger unit.

---

## Assignment Algorithm

### Input
- Sector with `sub_segments[]` (already computed by `splitNonContiguousSectors`)
- Sector's `assigned_brigade_ids[]` (already computed by `classifyBrigadesByTerritory`)
- Each brigade's `location_osid` and `home_osid`

### Algorithm: Home-Proximity Assignment

```
1. Separate brigades into front-line and reserve
   - Reserve: brigades explicitly marked as reserve or in reserve position
   - Front-line: everything else

2. For each front-line brigade, compute affinity to each sub-segment:
   affinity(brigade, sub_segment) =
     1.0 / (1 + minHopDistance(brigade.location_osid, sub_segment.friendly_osids))
     × (1.3 if brigade.home_osid ∈ sub_segment.friendly_osids else 1.0)
     × (1.2 if brigade.equipment_class == 'mechanized' and sub_segment is flat terrain)

3. Assign brigades to sub-segments using greedy best-fit:
   - Sort sub-segments by front_edges descending (widest first)
   - For each sub-segment, assign the brigade with highest affinity
   - If sub-segment has > WIDE_SEGMENT_THRESHOLD edges, assign 2+ brigades
   - Every front-line brigade must be assigned to exactly one sub-segment
   - Every sub-segment should have at least one brigade (if possible)

4. Store assignment: sub_segment.primary_brigade_ids: string[]
```

### Constants

```typescript
/** Sub-segments wider than this get 2+ brigades. */
const WIDE_SEGMENT_THRESHOLD = 5;  // front edges

/** Home OSID affinity bonus. */
const HOME_AFFINITY_BONUS = 1.3;

/** Mechanized brigade terrain affinity (flat/valley terrain). */
const MECH_TERRAIN_BONUS = 1.2;
```

---

## Combat Resolution Changes

### `computeDefenderPower` (sector_defense.ts)

**Current:**
```typescript
// Uniform: total sector power / sector edges
const basePower = sectorTotalPower / sectorFrontEdges;
```

**New:**
```typescript
// Find which sub-segment contains the attacked OSID
const subSeg = findSubSegmentForOsid(sector, targetOsid);
const primaryBrigades = subSeg.primary_brigade_ids;

// Primary defense: assigned brigade(s) power / sub-segment edges
const primaryPower = sum(primaryBrigades.map(b => getBrigadePower(b)))
                     / subSeg.front_edge_ids.length;

// Reactive defense: other brigades contribute via Layer A (existing)
// Already distance-weighted with 0.60^hops decay + home motivation
const reactivePower = computeReactiveDefense(sector, subSeg, primaryBrigades);

const totalDefense = primaryPower + reactivePower;
```

### Casualty Distribution

**No change needed.** Layer A already distributes casualties proportional to contribution weight. The primary brigade takes the largest share (highest weight), neighbors take proportional to their reactive contribution. This is exactly correct for per-brigade AoR.

### Entrenchment

**Minor change:** Entrenchment accumulates per brigade at their assigned position. If a brigade is reassigned to a new sub-segment, their entrenchment resets (they're digging new positions). This creates a cost to redistribution — you lose entrenchment when you move brigades.

```typescript
// On reassignment to new sub-segment:
if (brigade.assigned_sub_segment !== newSubSegment) {
    brigade.entrenchment *= REASSIGNMENT_ENTRENCHMENT_RETAIN; // 0.3 — lose most
}
```

---

## Bot AI Changes

### Target Selection Enhancement

Currently: bot picks attack targets by power ratio at the sector level.

**New:** bot can evaluate per-sub-segment defense strength:

```typescript
function findWeakestSubSegment(sector, intel): SubSegment {
    // For each sub-segment where we have intel:
    // Estimate defense = primary brigade strength + reactive estimate
    // Return sub-segment with lowest estimated defense
}
```

This gives the bot AI a reason to probe — probing reveals which sub-segment is weakest. The existing intel system (sector_intel) already provides per-sector confidence. Extending to per-sub-segment is natural.

### Brigade Assignment by Commander Personality

Aggressive commanders: concentrate best brigades on sub-segments facing offensive targets.
Defensive commanders: spread evenly, ensure every sub-segment has adequate coverage.
This hooks into the existing commander-driven assignment system (Phase 2a/2b in `classifyBrigadesByTerritory`).

---

## Gap Mechanics

When a primary brigade is force-retreated from their sub-segment:

1. **Immediate:** Sub-segment has no primary brigade. Defense drops to reactive-only (neighbors stretching to cover).
2. **Next turn:** Bot AI (or player) can:
   - Commit a reserve to fill the gap
   - Redistribute a brigade from an adjacent sub-segment (costs entrenchment)
   - Leave the gap (risky — enemy may exploit)
3. **Enemy exploitation:** The attacking bot detects the uncovered sub-segment and prioritizes it. This creates local breakthroughs — the current system's main weakness.

---

## State Changes

### Sub-Segment Extension

```typescript
// In corps_front_sectors.ts SubSegment type:
interface SubSegment {
    segment_id: string;
    friendly_osids: string[];
    hostile_osids: string[];
    front_edge_ids: string[];
    // NEW:
    primary_brigade_ids: string[];  // assigned front-line brigades
}
```

### Brigade State Extension

```typescript
// On FormationState:
assigned_sub_segment_id?: string;  // which sub-segment this brigade covers
```

---

## UI Changes

### Map Visualization
- On brigade hover/select: highlight the sub-segment they're assigned to (colored overlay on their friendly OSIDs)
- On sector view: show sub-segment boundaries with brigade names/icons at each segment
- Color-code sub-segments by defense density (green = well-covered, amber = thin, red = uncovered gap)

### Panel Information
- CorpsDetail: show sub-segment assignments per sector
- FormationDetail: show assigned AoR ("Covers: Gradačac east, 3 front edges")
- Sector tooltip: show per-sub-segment defense estimate

---

## Files Changed

| File | Change | Lines (est) |
|------|--------|-------------|
| `src/sim/combat/corps_front_sectors.ts` | Add `primary_brigade_ids` to sub-segments, assignment algorithm | +100 |
| `src/sim/combat/sector_defense.ts` | Use primary brigade power instead of sector average | +50, -30 |
| `src/sim/combat/combat_predictor.ts` | Match sector_defense changes for attack prediction | +30 |
| `src/sim/combat/bot_brigade_eval_attack.ts` | Evaluate per-sub-segment defense for target selection | +40 |
| `src/state/game_state.ts` | Add `assigned_sub_segment_id` to FormationState | +2 |
| `src/ui/map/map/MapContainer.tsx` | Sub-segment highlight on brigade hover | +50 |
| `src/ui/map/components/CorpsDetail.tsx` | Show sub-segment assignments | +30 |
| `src/ui/map/components/FormationDetail.tsx` | Show assigned AoR | +15 |
| `tests/brigade_aor_subsegment.test.ts` | NEW: assignment, defense computation, gap mechanics | +200 |
| **Total** | | **~+520** |

---

## What Does NOT Change

- Reactive defense formula (Layer A) — unchanged, becomes mutual support mechanism
- Stance modifiers (Layer B) — unchanged, applies to sector-level reactive bonus
- Reserve mechanics — reserves stay at sector level, no sub-segment assignment
- Enclave defense — unchanged
- Urban multipliers, terrain bonuses — unchanged
- Entrenchment accumulation rate — unchanged (only reset on reassignment)
- Casualty distribution — unchanged (already proportional to contribution weight)
- Operation system — unchanged (operations target OSIDs, not sub-segments)
- Peace plan / negotiation system — unchanged

---

## Calibration Impact

**Moderate.** The front becomes non-uniform, which means:
- Some positions become harder to crack (strong brigade + short segment)
- Some become easier (weak brigade + wide segment)
- Net effect depends on how well the bot distributes vs how well it finds weak spots

**Expectation:** Overall territorial balance stays similar because both sides get texture. RS still holds ~60% at w40. But the *shape* of combat changes — more local breakthroughs, more counterattacks, more dynamic front movement.

**Mitigation:** Run 40w calibration before and after. If area-weighted deviates >2pp, adjust reactive decay constant (currently 0.60) to tune mutual support strength.

---

## Implementation Phases

### Phase A: Assignment Only (no combat change)
- Assign brigades to sub-segments
- Display on map and panels
- Log assignments in save file
- **No combat formula change** — just data preparation
- Verify no regression

### Phase B: Combat Integration
- `computeDefenderPower` uses primary brigade + reactive
- `combat_predictor` updated to match
- Calibration run + comparison

### Phase C: Bot AI Enhancement
- Per-sub-segment target evaluation
- Probe-to-find-weakness pattern
- Commander personality affects assignment distribution

### Phase D: Gap Mechanics
- Uncovered sub-segment detection
- Reserve commitment to fill gaps
- Entrenchment reset on reassignment
- Enemy exploitation of gaps

---

*"A front is only as strong as its weakest brigade's AoR."*
