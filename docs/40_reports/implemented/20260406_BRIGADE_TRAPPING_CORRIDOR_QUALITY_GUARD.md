# Brigade Trapping — Corridor-Quality Guard (Re-investigation)
## Architect Escalation: 444th Mountain + 16th Krajina

**Date:** 2026-04-06  
**Status:** IMPLEMENTED — Scenario run pending  
**Supersedes:** Partial closeout in `20260406_FRONTLINE_TRUTH_444TH_16TH_KRAJINA.md`  
**vitest:** 2911/2911 (202 files) — 6 new tests added  
**tsc:** Clean

---

## 1. Why the Prior Closeout Was Rejected

The prior fix (Seam A + Seam B, `20260406_FRONTLINE_TRUTH_444TH_16TH_KRAJINA.md`) added an
isolation guard that asked: *"does the target OSID have ANY friendly-controlled neighbor in the
full adjacency map?"*

The 16th Krajina closeout then argued that `cukle_2` was not isolated because:

> "a near-miss edge exists between `cukle_2` and `op:skender_vakuf:donji_koricani` (RS,
> shared_segments=0, min_dist=0.079 km). `donji_koricani` has 8 solid RS edges..."

**The architect rejected this reasoning.** The prior closeout answered the wrong question.

### Why it was wrong

A near-miss edge (`shared_segments=0, min_dist=0.079 km`) is a **point-touch contact** — two
polygon corners that meet at a single vertex with no shared boundary segment. It is:
- Not a supply route
- Not a defensible corridor
- Not visible on the player map as a front edge (never rendered)
- Already excluded by `buildSharedBoundaryAdjacency`, which the codebase uses for sector
  construction and `isSegmentAdjacent`

The prior guard used `buildOsidAdjacency` (full map, 2047 edges including all 48 point-touch
contacts). `sharedBoundaryAdjacency` (quality-filtered, excludes `shared_segments=0` AND
`min_dist > 0.00005`) was already computed and sitting on `SpatialContext` — but was never
used for the isolation check.

### The command-quality question answered

> Why would a sane commander choose that position?

Because the engine told the commander: *"there is a friendly OSID adjacent to `cukle_2`
(donji_koricani, RS-controlled)"* — via the full adjacency map. This is technically true at the
graph level but false at the operational level. No real supply corridor exists. The engine's
corridor model was invisible to the isolation check.

> What command-quality concept was missing?

**Corridor quality.** A sane commander does not commit a brigade to a position unless there
is a *real-border* corridor to a friendly OSID — not a 0.079 km point-touch between two
polygon corners. The missing predicate: *"at least one shared-boundary (real-border) friendly
neighbor"*.

> Why is "not destroyed" not success?

A brigade that captures `cukle_2` via a point-touch corridor:
- Has no visible supply line
- Cannot be relieved through a real corridor  
- Is invisible on the player's front-edge map as "connected"
- Represents a command failure even if it survives by chance

---

## 2. Root Cause

### Two adjacency maps exist in SpatialContext

```typescript
// src/sim/spatial_context.ts:34
readonly sharedBoundaryAdjacency: ReadonlyMap<Osid, readonly Osid[]>;
```

| Map | Filter | Used for |
|---|---|---|
| `adjacency` | None — all 2047 edges | BFS movement, ZoC, bot pathing |
| `sharedBoundaryAdjacency` | Excludes `shared_segments=0` AND `min_dist > 0.00005` | Sector construction, `isSegmentAdjacent` |

### Where the wrong map was used

Three locations in the command layer all used `adjacency` (full map) for isolation decisions:

| Location | Line | Description |
|---|---|---|
| `plan.ts` | 1270 | `isIsolatedCapture` in `selectOpportunityTargets` |
| `emit.ts` | 757 | Probe enemy-target discovery (scan friendly OSID neighbors) |
| `emit.ts` | 779 | Probe approach-OSID reachability (neighbors of probe target) |

### cukle_2 adjacency: full vs shared-boundary

All 10 edges for `op:travnik:cukle_2`:

| Neighbor | min_dist | shared_segments | Controller | In sharedBoundaryAdj? |
|---|---|---|---|---|
| `op:skender_vakuf:donji_koricani` | 0.0787 | **0** | RS | **NO** — point-touch AND distance |
| `op:travnik:gluha_bukovica` | 0 | 5 | RBiH | Yes |
| `op:travnik:podstinje` | 0 | 6 | RBiH | Yes |
| `op:travnik:puticevo_2` | 0 | 4 | RBiH | Yes |
| `op:travnik:travnik_2` | 0 | 2 | RBiH | Yes |
| `op:vitez:preocica_3` | 0 | 3 | RBiH/HRHB | Yes |
| `op:zenica:orahovica_2` | 0 | 14 | RBiH | Yes |
| `op:zenica:serici_2` | 0 | 8 | RBiH | Yes |
| `op:zenica:stranjani_2` | 0 | 15 | RBiH | Yes |
| `op:travnik:paklarevo` | 0.0679 | 1 | RBiH | **NO** — distance contact |

**RS neighbors in sharedBoundaryAdjacency: zero.** The only RS neighbor (donji_koricani) is
excluded on both criteria. The old guard found it via the full map and passed the op. The new
guard finds nothing and blocks it.

### 444th Mountain at sela_2

The prior report correctly concluded that `sela_2` is RBiH-controlled and has real-border
RBiH neighbors. The island guard was appropriate for the 444th case (march to 0-neighbor
island). The new corridor-quality guard does not change 444th behavior — `sela_2` passes the
shared-boundary check correctly. The `home_osid` distance anomaly (brigade assigned far from
Jablanica) remains a pre-existing structural issue unrelated to isolation.

---

## 3. Fix Landed

### Change 1 — plan.ts: upgrade isIsolatedCapture

**File:** `src/sim/combat/commander/plan.ts`  
**Lines:** 1267–1273

```typescript
// Before
const factionFriendlyOsids = briefing.spatial?.friendlyOsidsByFaction?.get(briefing.faction);
const isIsolatedCapture = (osid: string): boolean => {
    if (!adjacency || !factionFriendlyOsids) return false;
    const neighbors = adjacency.get(osid as any) ?? [];
    if ((neighbors as readonly string[]).length === 0) return false;
    return !(neighbors as readonly string[]).some(n => factionFriendlyOsids.has(n));
};

// After
const sbAdjacency = briefing.spatial?.sharedBoundaryAdjacency;
const factionFriendlyOsids = briefing.spatial?.friendlyOsidsByFaction?.get(briefing.faction);
const isIsolatedCapture = (osid: string): boolean => {
    if (!sbAdjacency || !factionFriendlyOsids) return false;  // no data → allow
    const neighbors = sbAdjacency.get(osid as any) ?? [];
    if ((neighbors as readonly string[]).length === 0) return false;
    return !(neighbors as readonly string[]).some(n => factionFriendlyOsids.has(n));
};
```

The existing `adjacency` variable is retained for `approachCount` (unchanged).

### Change 2 — emit.ts: probe enemy-target discovery

**File:** `src/sim/combat/commander/emit.ts`  
**Line:** 757

```typescript
// Before
const adjacency = briefing.spatial.adjacency;
// After
const adjacency = briefing.spatial.sharedBoundaryAdjacency ?? briefing.spatial.adjacency;
```

### Change 3 — emit.ts: probe approach-OSID reachability

**File:** `src/sim/combat/commander/emit.ts`  
**Line:** 779

```typescript
// Before
const probeAdj = briefing.spatial.adjacency;
// After
const probeAdj = briefing.spatial.sharedBoundaryAdjacency ?? briefing.spatial.adjacency;
```

### Why the fallback in emit.ts

Unit-test fixtures may not populate `sharedBoundaryAdjacency`. The `?? adjacency` fallback
preserves safe degradation: when the quality map is absent, the engine falls back to full
adjacency (prior behavior). The guard degrades gracefully rather than silently blocking all
probes in a test environment.

---

## 4. What Now Stops It

The probe op at emit.ts:

1. Scans `sub_segment.friendly_osids` neighbors in `sharedBoundaryAdjacency` for enemy targets.
   `donji_koricani` does not find `cukle_2` as a shared-boundary neighbor → `enemyTargets` is
   empty for cukle_2.

2. Even if cukle_2 were discovered via some other path, the reachability check
   (`probeAdj.get(cukle_2)` → shared-boundary neighbors) finds zero RS-controlled neighbors →
   `approachOsids` is empty → `probeReachable = false` → probe not created.

The opportunity op at plan.ts selectOpportunityTargets:

3. `isIsolatedCapture(cukle_2)` now checks `sbAdjacency.get(cukle_2)` → 8 entries, all
   RBiH/HRHB-controlled → none in `factionFriendlyOsids` (RS) → returns `true` → filtered out.

All three paths are now consistent: a target with no real-border friendly neighbor is rejected.

---

## 5. Broader Scope Check

Does the same gap exist in other planning paths?

| Path | Gap? | Notes |
|---|---|---|
| `selectOpportunityTargets` (plan.ts) | **FIXED** | isIsolatedCapture → sbAdjacency |
| Probe target discovery (emit.ts:757) | **FIXED** | sbAdjacency ?? adjacency |
| Probe reachability (emit.ts:779) | **FIXED** | sbAdjacency ?? adjacency |
| `buildCommanderOperation` factory | Not applicable — no objective selection here |
| `buildProbeOperation` factory | Not applicable — receives objectives from emit.ts |
| `buildEmergencyDefenseOperation` factory | Not applicable — defensive, no new territory |
| `brigade_front_distribution.ts` island guard | Unchanged — still uses full adjacency |

`brigade_front_distribution.ts` uses the full adjacency for march destination island-check. This
is less critical than planning paths (march destinations are front OSIDs already in the sector,
not new captures). Upgrading it would require passing `sharedBoundaryAdjacency` as an additional
parameter. Deferred as P3 — no known bug pattern currently attributed to this path.

---

## 6. Tests

**File:** `tests/commander/corridor_quality_guard.test.ts` (6 tests)

| Test | What it proves |
|---|---|
| Suite 1 Test 1 | `cukle_mock` (zero sbAdj RS neighbors) excluded from selectOpportunityTargets |
| Suite 1 Test 2 | `solid_target` (real-border RS neighbor) passes through |
| Suite 1 Test 3 | When sbAdjacency absent: cukle_mock allowed (fallback) |
| Suite 2 Test 4 | Probe NOT created when sbAdj has no enemy neighbors |
| Suite 2 Test 5 | Probe IS created when sbAdj has real-border enemy neighbor |
| Suite 2 Test 6 | Probe created via full adjacency when sbAdj absent (safe fallback) |

**Full suite:** 2911/2911 passed (202 files, 0 failures)

---

## 7. Residual Risks

| Item | Severity | Notes |
|---|---|---|
| `brigade_front_distribution.ts` island guard uses full adjacency | P3 | March destinations are front OSIDs, not new captures. Near-miss edges would only matter if a sector front OSID were itself near-miss connected. No known bug pattern. |
| 444th `home_osid` distance anomaly | P2 | Pre-existing. Brigade assigned to Kalinovik theater, home in Jablanica. Separate sector assignment issue. |
| Mid-turn corridor collapse (correctTransitStates) | P3 | Already mitigated by prior Seam A fix — still uses full adjacency but blocks 0-neighbor island cases. Rare convergence risk. |
| `destruction_turn` not stamped in all inactive paths | P2 | Only dispersal path and OG dissolution stamped (prior fix). Other `status='inactive'` assignments may not set `destruction_turn`. |

---

## 8. Prior Report Correction

`docs/40_reports/implemented/20260406_FRONTLINE_TRUTH_444TH_16TH_KRAJINA.md` section 3 states:

> "The brigade ends at `cukle_2` (RS-controlled) not because the guard allowed it, but because
> `cukle_2` was never actually isolated: a near-miss edge exists..."

**This reasoning is incorrect** and has been superseded by this report. `cukle_2` WAS
operationally isolated — the near-miss edge is not a real supply corridor. The prior guard used
the wrong adjacency map. The new guard correctly blocks `cukle_2`-pattern positions.

The prior report's description of Seam A (444th Mountain) and Seam B (selectOpportunityTargets
in plan.ts) remain accurate as partial fixes. This report adds the missing third fix (emit.ts
probe op path) and upgrades the Seam B isolation check to use shared-boundary adjacency.

---

## 9. Verification Results (n1346)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean — 0 errors |
| `npm run test:vitest` | **2911/2911 passed**, 202 files |
| Area-weighted calibration | **93.4%** (n1345 baseline: 93.3%, delta +0.1pp) |
| Anchors | **26/27** — boljanic_2 pre-existing failure (same as n1289/n1345) |
| Benchmarks | **6/6** |
| Battles | 65 |
| cukle_2 controller (end of run) | **RBiH** — RS never captured it |
| 16th Krajina Motorized location | `op:teslic:vitkovci` — in Teslic corridor, not near Travnik |
| 444th Mountain Brigade location | `op:kalinovik:sela_2` — holding under pressure (multiple battles turns 36/38/40) |
| Destroyed brigades | Same 4 as n1345 — no new destructions |
| cukle_2 in shared-boundary RS neighbors | **Zero** — confirmed by adjacency data analysis |

### Brigade narrative (n1346)

**16th Krajina:** Fought two battles — probed `op:travnik:gluha_bukovica` (turn 26, beaten back by 706th Muslim Mountain) and captured `op:teslic:kamenica_2` (turn 31 vs HRHB 111th). Ended in column march toward Teslic corridor follow-on. No Travnik deep probe. The cukle_2-pattern operation is completely absent.

**444th Mountain:** Held `sela_2` under sustained combat pressure (turns 36, 38, 40). Active, not stranded. Correct behavior for an assigned front position.
