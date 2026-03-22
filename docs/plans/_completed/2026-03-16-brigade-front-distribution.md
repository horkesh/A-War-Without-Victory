# Brigade Front Distribution & Interior Movement Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two brigade placement defects: (1) brigades stacking 2-6 deep at single OSIDs instead of spreading across sector fronts, and (2) 36 brigades sitting 3-11 hops behind their assigned sector front with no code to march them forward.

**Architecture:** Add a new pipeline step `distribute-brigades-to-front` that runs immediately after `assign-brigades-to-subsegments`. For each brigade assigned to a sub-segment, if the brigade is not already at one of the sub-segment's `friendly_osids`, pick the best available OSID (least-stacked, closest, home affinity) and issue a column march order. For brigades already at front but stacked, redistribute to adjacent under-covered friendly OSIDs within the same sub-segment.

**Tech Stack:** TypeScript, Vitest, existing OSID adjacency + column movement infrastructure.

**Key constraints:**
- Deterministic (sorted iteration, no randomness)
- Brigades in active operations are EXEMPT (ops own their positioning)
- Sarajevo siege brigades are EXEMPT (stacking is correct there — dense urban garrison)
- Column march orders use existing `osid_column_movement.ts` infrastructure
- One-hop adjacent redistribution is instant (no column march needed)
- Entrenchment penalty on relocation (existing `REASSIGNMENT_ENTRENCHMENT_RETAIN`)

---

## Diagnostic Baseline (n840)

| Metric | Value |
|---|---|
| Stacked OSIDs (2+ brigades) | 53 |
| Non-Sarajevo, non-ops stacking | 46 |
| Worst stacking | 6 brigades at Gornji Vakuf |
| Brigades 3+ hops from sector front | 36 |
| Brigades 6+ hops from sector front | 21 |
| Furthest brigade | 11 hops (arbih_145th at Fojnica) |
| Sector AoR contiguity | 0/107 non-contiguous (clean) |

---

### Task 1: Write the distribution function (TDD — failing tests first)

**Files:**
- Create: `src/sim/combat/brigade_front_distribution.ts`
- Create: `tests/brigade_front_distribution.test.ts`

**Step 1: Write failing tests**

Test file: `tests/brigade_front_distribution.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { distributeBrigadesToFront } from '../src/sim/combat/brigade_front_distribution.js';
// ... test helpers for minimal GameState, sectors, adjacency

describe('distributeBrigadesToFront', () => {
    it('spreads 3 brigades at same OSID across 3 sub-segment friendly OSIDs', () => {
        // 3 brigades all at osid-A, sub-segment has friendly_osids [osid-A, osid-B, osid-C]
        // After distribution: each brigade at a different OSID
    });

    it('issues column march for brigade 5+ hops behind front', () => {
        // Brigade at rear OSID, assigned to sub-segment with front OSIDs 7 hops away
        // After: brigade_movement_state set to column march toward nearest front OSID
    });

    it('skips brigades in active operations', () => {
        // Brigade with operation participation → location unchanged
    });

    it('skips Sarajevo siege brigades', () => {
        // Brigade in ALWAYS_BESIEGED_ENCLAVES sector → no redistribution
    });

    it('prefers least-stacked OSID within sub-segment', () => {
        // 2 brigades at osid-A (stacked), osid-B empty — redistribute 1 to osid-B
    });

    it('prefers home OSID when available and unstacked', () => {
        // Brigade home_osid is in sub-segment friendly_osids and empty → pick it
    });

    it('does not move brigades already alone at a front OSID', () => {
        // Brigade alone at a front OSID → no movement order
    });

    it('handles single-OSID sub-segments (stacking is acceptable)', () => {
        // Sub-segment with only 1 friendly OSID → all brigades stay (unavoidable)
    });
});
```

**Step 2: Run tests — verify they fail**

```bash
npx vitest run tests/brigade_front_distribution.test.ts
```

**Step 3: Implement `distributeBrigadesToFront`**

File: `src/sim/combat/brigade_front_distribution.ts`

Core algorithm:
```
for each sector:
  if sector is besieged enclave → skip
  for each sub_segment:
    frontOsids = sub_segment.friendly_osids
    brigades = sub_segment.primary_brigade_ids (active, not in ops)

    // Count current stacking
    osidCounts = Map<osid, count> from brigade locations

    // Phase A: Redistribute stacked brigades to empty front OSIDs (1-hop moves)
    for each brigade at an OSID with count >= 2:
      find adjacent friendly OSID in frontOsids with count == 0
      if found: move brigade there (instant, set location_osid)

    // Phase B: Issue column march for far-away brigades
    for each brigade NOT at any frontOsid:
      target = least-stacked frontOsid (tie-break: home affinity, then deterministic)
      if BFS distance > 1:
        write column march order to brigade_movement_orders
      else:
        set location_osid directly (adjacent move)
```

**Key details:**
- `isOperationParticipant(state, brigadeId)` check from `compute_home_defense.ts` — already exists
- `ALWAYS_BESIEGED_ENCLAVES` from `enclave_resilience.ts` — check `sector.corps_id` against enclave corps
- Adjacency from `buildOsidAdjacency(edges)` — already used by sub-segment assignment
- Column march via `brigade_movement_orders[fid] = { destination_sids: [target], stance: 'column' }` — picked up by existing `osid-column-movement` step next turn

**Step 4: Run tests — verify they pass**

**Step 5: Commit**

---

### Task 2: Wire into the pipeline

**Files:**
- Modify: `src/sim/turn_phases/war_phases.ts` (after `assign-brigades-to-subsegments`, ~line 589)

**Step 1: Add pipeline step**

Insert after the `assign-brigades-to-subsegments` step (line 589):

```typescript
{
    name: 'distribute-brigades-to-front',
    run: async (context) => {
        if (context.state.meta.phase !== 'war') return;
        const sectorMap = context.state.military.corps_front_sectors;
        if (!sectorMap) return;
        const od = getOperationalData(context);
        if (!od?.edges?.length) return;
        const adjacency = buildOsidAdjacency(od.edges);
        distributeBrigadesToFront(context.state, Object.values(sectorMap), adjacency);
    }
},
```

**Step 2: Import at top of war_phases.ts**

```typescript
import { distributeBrigadesToFront } from '../combat/brigade_front_distribution.js';
```

**Step 3: Run full test suite**

```bash
npm run test:vitest
```

**Step 4: Commit**

---

### Task 3: Run scenario and validate

**Step 1: Run 40w scenario**

```bash
npm run sim:scenario:run:40w
```

**Step 2: Run stacking diagnostic**

Use the diagnostic script from the investigation (count stacked OSIDs, brigades far from front). Target:
- Non-Sarajevo non-ops stacking: < 15 (from 46)
- Brigades 3+ hops from front: < 10 (from 36)
- Area-weighted match: within 1% of 89.4% baseline

**Step 3: Run comparison tool**

```bash
node tools/compare_painted_vs_sim.cjs runs/<latest_run_dir>
```

Verify no calibration regression.

**Step 4: Commit with results**

---

### Task 4: Handle edge cases and tune

**Step 1: Verify operation exemption works**

Check that brigades in active sector offensives are NOT redistributed (their positioning is dictated by the operation's march/attack logic).

**Step 2: Verify enclave exemption**

Sarajevo brigades should remain stacked (correct behavior — dense urban garrison in a besieged pocket).

**Step 3: Tune the redistribution aggressiveness**

Constants to consider:
- `MAX_COLUMN_MARCH_HOPS = 8` — don't issue column march for brigades > 8 hops away (they may be legitimately in a different theatre and will be reassigned next sector rebuild)
- `REDISTRIBUTION_COOLDOWN_TURNS = 3` — don't redistribute a brigade that was just redistributed (prevents oscillation)
- Adjacent redistribution should respect entrenchment — only move if the brigade has < 1 turn of entrenchment (freshly assigned)

**Step 4: Run final scenario and commit**

---

## Success Criteria

| Metric | Before | Target |
|---|---|---|
| Non-Sarajevo non-ops stacking | 46 | < 15 |
| Brigades 3+ hops from front | 36 | < 10 |
| Calibration (area-weighted) | 89.4% | ≥ 88.5% |
| Benchmarks passing | 5/6 | ≥ 5/6 |
| Vitest suite | 932+ pass | All pass |

## Risk Assessment

- **Redistribution oscillation**: Brigade moved to OSID-B turn N, reassigned back to OSID-A turn N+1 → cooldown constant prevents this
- **Calibration regression**: Spreading brigades thins defense at stacked OSIDs → may need to tune; the unified sector defense model already accounts for sector-wide defense, so physical position matters less for combat than for the "far from front" problem
- **Column march congestion**: Many brigades marching at once → existing column movement is sequential, no collision risk
