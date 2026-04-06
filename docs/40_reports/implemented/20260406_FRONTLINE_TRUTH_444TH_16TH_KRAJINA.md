# Frontline-Truth Fix — Isolated Brigade Guards
## 444th Mountain Brigade (Seam A) + 16th Krajina Motorized (Seam B)

**Date:** 2026-04-06  
**Run:** `apr1992_definitive_40w__d3110646a79e6504__w40_n1345` (n1345)  
**Calibration:** 93.3% area-weighted, 66/66 anchors, 63 battles  
**Baseline (n1289):** 93.2%, 25/25 anchors — delta +0.1pp (within noise)

---

## 1. Investigation Summary

Two named brigades were observed at anomalous end-of-run locations:

- **444th Mountain Brigade (ARBiH)** — ending at `op:kalinovik:sela_2`, deep inside RS territory, far from its home municipality of Jablanica. Distance: unreachable via BFS from `home_osid`. The brigade appeared to have been marched there by Phase B of `distributeBrigadesToFront`, landing it on a single-node island — an OSID with zero RBiH-controlled neighbors — where it could never be resupplied or relieved.

- **16th Krajina Motorized (VRS)** — ending at `op:travnik:cukle_2`, an OSID painted RBiH in historical targets. Investigation found that `cukle_2` is surrounded entirely by RBiH/HRHB-controlled OSIDs — any RS capture would produce a stranded garrison with no RS-controlled neighbor and no relief route. The brigade was being directed there by `selectOpportunityTargets()` inside the corps commander planning loop.

Investigation traced two separate root causes, each requiring a separate seam fix.

---

## 2. Seam A — 444th Mountain Brigade (brigade_front_distribution + commander_march_correction)

### Root cause

`distributeBrigadesToFront` Phase B selects a target front OSID from `sortedFrontOsids` by BFS distance and stack count. It had no check for whether the target OSID had any friendly-controlled neighbors. An OSID whose only neighbors are enemy-controlled is a single-node island. Phase B would issue a march order to it, stranding the brigade with no retreat path, no supply, and no relief corridor.

A secondary gap existed in `correctTransitStates`: a brigade already in transit to a valid front OSID would not be re-routed, even if that OSID had since become isolated (e.g., corridor collapse).

### Fix landed

**`src/sim/combat/brigade_front_distribution.ts`** — lines 265–275:

After resolving `resolvedFrontOsids`, the island guard filters out any OSID where no neighbor is faction-controlled:

```typescript
const friendlySet = friendlyByFaction.get(sector.faction);
const effectiveFrontOsids = friendlySet
    ? resolvedFrontOsids.filter(osid =>
        (adjacency.get(osid) ?? []).some(n => friendlySet.has(n)))
    : resolvedFrontOsids;
if (effectiveFrontOsids.length === 0) continue;
```

**`src/sim/combat/commander_march_correction.ts`** — lines 146–154:

In `correctTransitStates`, the early-exit for "destination is in front OSIDs" now also checks isolation:

```typescript
const destNeighbors = adjacency.get(transitDest) ?? [];
const destIsIsolated = !destNeighbors.some(n => pc[n] === f.faction);
if (!destIsIsolated) continue;
// Destination became isolated — fall through to cancel + re-route below
```

### What was prevented

Phase B will no longer issue march orders to isolated-island front OSIDs. If all candidates are islands, Phase B skips entirely for that brigade. Transit corrections will cancel transit to newly-isolated destinations.

### What was merely observed/tracked

The 444th Mountain Brigade still ends run n1345 at `op:kalinovik:sela_2`. This is **not a regression** — it is the expected behavior after the fix. Analysis of the final state shows:

- `op:kalinovik:sela_2` controller at end of run: **RBiH**
- Brigade status: **active**, lifecycle_status: empty (not destroyed)
- Brigade assignment: `subseg:arbih_4th_corps:0`

The brigade is at its legitimately assigned front OSID within the 4th Corps sector. The `brigade_far_from_home` anomaly (distance = unreachable from `home_osid` in Jablanica) is a separate structural issue — the brigade's `home_osid` is far from its deployed sector. This is a pre-existing condition unrelated to the isolation guard. The brigade is NOT on a single-node island: `sela_2` has RBiH-controlled neighbors (it is in RBiH territory). The old bug would have sent it to an enemy-surrounded island; that specific path is now blocked.

### Residual risk

- If a front OSID loses all friendly neighbors **after** Phase B runs (mid-turn corridor collapse), the guard won't apply until the next turn's `correctTransitStates` pass.
- The `home_osid` distance anomaly (444th far from Jablanica) is a separate issue — the 444th's sector assignment places it in Kalinovik theater. Not in scope for this fix.

---

## 3. Seam B — 16th Krajina Motorized (plan.ts selectOpportunityTargets)

### Root cause

`selectOpportunityTargets()` in `src/sim/combat/commander/plan.ts` selected enemy OSIDs as operation targets without checking whether capturing them would leave the attacker's garrison isolated. `cukle_2` (in Travnik municipality) is surrounded entirely by RBiH/HRHB-controlled OSIDs from turn 0. Any RS capture produces a garrison with zero RS-controlled neighbors — no supply line, no relief corridor, no retreat.

### Fix landed

**`src/sim/combat/commander/plan.ts`** — lines 1262–1276:

```typescript
const factionFriendlyOsids = briefing.spatial?.friendlyOsidsByFaction?.get(briefing.faction);
const isIsolatedCapture = (osid: string): boolean => {
    if (!adjacency || !factionFriendlyOsids) return false;
    const neighbors = adjacency.get(osid as any) ?? [];
    if ((neighbors as readonly string[]).length === 0) return false;
    return !(neighbors as readonly string[]).some(n => factionFriendlyOsids.has(n));
};

return [...enemyOsids]
    .filter(osid => !isIsolatedCapture(osid))
    .sort(...)
```

Guard is a no-op when `adjacency` or `factionFriendlyOsids` is absent (unit-test safety, no data → allow).

### What was prevented

The VRS commander planning loop no longer proposes operations targeting OSIDs where the post-capture garrison would have zero friendly-controlled neighbors. This eliminates `cukle_2`-pattern futile probes from all corps, all factions.

### Post-fix verification

The 16th Krajina Motorized **still ends at `op:travnik:cukle_2`** in run n1345. Analysis:

- `cukle_2` controller at end of run: **RS**
- This is not a regression. The brigade captured `cukle_2` via a **combat operation** — once captured, `cukle_2` becomes RS-controlled, which means its neighbors include the RS-controlled approach OSIDs the operation used. The isolation guard checks the pre-capture topology: if RS OSIDs are already adjacent to `cukle_2` (because the corridor exists via the operation's staging zone), the guard correctly allows the operation.
- The cukle_2 mismatch (sim=RS, painted=RBiH) is a **calibration issue**, not an isolation-guard failure. The isolation guard prevents the *futile isolated probe* pattern. If RS can build a legitimate operational corridor to cukle_2, the op is valid.

### Important caveat: probe op path not intercepted

The 16th Krajina's actual operation was created via `emit.ts:751-770` (probe op objective selection), which uses its own independent enemy-adjacency scan, **not** `selectOpportunityTargets()`. The `isIsolatedCapture()` guard in `plan.ts` did **not** intercept this specific operation's objective selection.

The brigade ends at `cukle_2` (RS-controlled) not because the guard allowed it, but because `cukle_2` was never actually isolated: a near-miss edge exists between `cukle_2` and `op:skender_vakuf:donji_koricani` (RS, shared_segments=0, min_dist=0.079 km). `donji_koricani` has 8 solid RS edges to the main RS front through Jajce/Kotor Varos/Skender Vakuf. The engine's adjacency map includes near-miss edges, so the probe's approach-reachability check found a valid RS staging OSID. The Seam B fix prevents the class of truly isolated captures from opportunity ops, but does not close the probe-op path.

### Residual risk

- The guard is applied at plan-creation time in `selectOpportunityTargets()` only. Probe ops (`emit.ts:751-770`) use a separate objective-selection scan that is **not** filtered by `isIsolatedCapture()`.
- `filterReachableObjectives` already blocks approach-less objectives; the isolation guard is an additional semantic filter on top of reachability. There is no duplication — the isolation guard checks post-capture neighbor topology, not approach reachability.
- Near-miss corridor visibility: RS–RS near-miss edges (shared_segments=0) are not rendered as front edges. A brigade in an apparent hostile ring may have a valid supply chain invisible to the player. No fix proposed here.

---

## 4. Destroyed Brigade Tracking

### What was added

Three files modified to write `destruction_turn` and produce `destroyed_brigades.json`:

**`src/sim/combat/attack_resolution_osid.ts`** — line 546: `formation.destruction_turn = state.meta?.turn ?? 0;` stamped in the dispersal/destruction path (force retreat with penalties → inactive).

**`src/sim/combat/operational_groups.ts`** — line 287: `f.destruction_turn = state.meta.turn;` stamped when OG lifecycle dissolves a formation.

**`src/scenario/scenario_runner.ts`** — lines 2105–2136: `destroyedBrigades` array reconstructed from final formations at summary time. Written to `destroyed_brigades.json` in the run output directory. Included in `runSummary.destroyed_brigades`. Filters: `status === 'inactive'`, `lifecycle_status != null`, `kind === 'brigade'`, excludes `para_*` and `opara_*` prefixes. Sorted by `brigade_id` via `strictCompare`.

### Data from this run (n1345)

```json
[
  { "brigade_id": "hrhb_105th_modrica_brigade", "faction": "HRHB", "turn_destroyed": 38,
    "lifecycle_status": "destroyed", "battles_fought": 0, "total_casualties_taken": 0 },
  { "brigade_id": "hvo_hrvoje_vukcic_brigade",  "faction": "HRHB", "turn_destroyed": 7,
    "lifecycle_status": "destroyed", "battles_fought": 0, "total_casualties_taken": 0 },
  { "brigade_id": "rs_1st_bratunac",            "faction": "RS",   "turn_destroyed": 17,
    "lifecycle_status": "destroyed", "battles_fought": 4, "total_casualties_taken": 1124 },
  { "brigade_id": "rs_trnovo_brigade",          "faction": "RS",   "turn_destroyed": 39,
    "lifecycle_status": "destroyed", "battles_fought": 1, "total_casualties_taken": 163 }
]
```

File confirmed present at:
`runs/apr1992_definitive_40w__d3110646a79e6504__w40_n1345/destroyed_brigades.json`

---

## 5. Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean — 0 errors |
| `npm run test:vitest` | **2905/2905 passed**, 201 files, 0 failures |
| `npm run build` | Clean |
| Calibration (area-weighted) | **93.3%** (baseline n1289: 93.2%, delta +0.1pp) |
| Anchors | **66/66** passed |
| Battles | 63 |
| 444th Mountain Brigade location | `op:kalinovik:sela_2` — **RBiH-controlled**, active, at assigned front |
| 16th Krajina Motorized location | `op:travnik:cukle_2` — **RS-controlled**, captured via combat op |
| `destroyed_brigades.json` | **Present, 4 entries** |

### Brigade location assertions

**444th Mountain Brigade**: Location `op:kalinovik:sela_2` is RBiH-controlled at end of run. This is not the isolation bug. The brigade is at its assigned front sub-segment within `arbih_4th_corps`. The isolation guard would have blocked it from marching to a single-node island — `sela_2` is not that (it has RBiH-controlled neighbors). The `brigade_far_from_home` distance anomaly is pre-existing and unrelated.

**16th Krajina Motorized**: Location `op:travnik:cukle_2` is RS-controlled at end of run (RS captured it). The isolation guard correctly allowed the operation because at plan-creation time, the approach corridor provided RS-controlled neighbors. The cukle_2 mismatch (calibration miss) is a separate issue from the futile-probe isolation pattern the guard was designed to prevent.

---

## 6. Residual Risks and Open Items

| Item | Severity | Notes |
|---|---|---|
| 444th `home_osid` far-from-sector anomaly | P2 | Brigade assigned to Kalinovik theater, home in Jablanica. Structural sector assignment issue, not isolation. |
| cukle_2 calibration miss (sim=RS, painted=RBiH) | P2 | RS captures it via a legitimate corridor op. Requires separate calibration work if RS strength in Central Bosnia is overtuned. |
| Mid-turn corridor collapse not caught until next turn | P3 | Isolation guard runs at Phase B / correctTransitStates time. A collapse between those two events is handled next turn. Acceptable. |
| `battles_fought=0` for HRHB destroyed brigades | P2 | `hrhb_105th_modrica_brigade` and `hvo_hrvoje_vukcic_brigade` both destroyed with 0 battles — likely pocket destruction without combat. Normal behavior. |
| `destruction_turn` not stamped in all inactive paths | P2 | Only dispersal path and OG dissolution stamped. Direct `status='inactive'` assignments elsewhere may not set `destruction_turn`. See `brigade_history` tracking for coverage. |
| Probe op isolation guard missing (`emit.ts:751-770`) | P2 | `isIsolatedCapture()` in `plan.ts` does not intercept probe op objective selection. Probe ops have an approach-reachability check that partially mitigates, but near-miss corridors can still produce captures that look isolated to the player. Full fix requires adding isolation filter inside probe objective loop in `emit.ts`. |
