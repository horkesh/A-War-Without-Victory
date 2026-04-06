# Brigade Trapping — Retroactive Tooth Eviction Guard (Phase 2)
## Architect Escalation: 444th Mountain at sela_2

**Date:** 2026-04-06  
**Status:** IMPLEMENTED — Run n1349 verified  
**Supersedes:** Nothing — this is Phase 2; Phase 1 report is `20260406_BRIGADE_TRAPPING_CORRIDOR_QUALITY_GUARD.md`  
**vitest:** 2923/2923 (204 files) — 7 new tests added  
**tsc:** Clean

---

## 1. Problem: The Retroactive Tooth

Phase 1 (corridor-quality guard) prevented the 16th Krajina from marching to `cukle_2` — a
position with no real-border friendly corridor. It did not address a structurally different failure
mode: a brigade that marched to a *valid* position, which later became a tooth after the surrounding
terrain shifted under it.

### Root Cause

The 444th Mountain Brigade marched to `op:kalinovik:sela_2` while it was part of a 9-OSID
sub-segment. At march time, `sela_2` had real-border friendly neighbors and passed all isolation
checks. The march was correct.

RS subsequently captured adjacent OSIDs. `sela_2` became the **sole OSID in its sub-segment**
retroactively — not because the brigade marched badly, but because the front collapsed around it.

| State | Sub-segment size | Enemy-facing edges | Reserve brigades |
|---|---|---|---|
| At march time | 9 OSIDs | Mixed | Normal distribution |
| End-state | **1 OSID** | **8 RS-facing** | **0** |

No eviction logic existed. The brigade held `sela_2` indefinitely — a sole-OSID sub-segment with
8 hostile-facing edges and no reserve to relieve it.

### What Is a Retroactive Tooth

A **retroactive tooth** is a sub-segment that has been reduced to a single OSID by enemy capture
of surrounding OSIDs after a brigade was assigned or marched there. It differs from a march-time
tooth (which Phase 1 addresses) in that:

- The position was valid when occupied
- The isolation is a consequence of battlefield deterioration, not a planning failure
- The brigade cannot self-identify the problem — it requires a standing eviction check each turn

---

## 2. What Phase 1 Did Not Cover

Phase 1 fixed the **planning layer**: `isIsolatedCapture` in `plan.ts` and probe path construction
in `emit.ts` now use `sharedBoundaryAdjacency` to reject corridors made only of point-touch edges.

Phase 1 did **not** add any logic to evaluate whether a brigade *already holding* a front OSID
should retrograde when that OSID's sub-segment collapses to a single entry.

| Layer | Phase 1 | Phase 2 |
|---|---|---|
| Op planning — target selection | Fixed (isIsolatedCapture → sbAdjacency) | N/A |
| Op planning — probe path creation | Fixed (emit.ts:757, emit.ts:779) | N/A |
| Brigade already holding — standing eviction check | Not covered | **This report** |

---

## 3. Fix Landed

### Location

**File:** `src/sim/combat/bot_brigade_eval_front.ts`  
**Function:** `evaluateSectorMarch` — `else`-branch (brigade already on a sector front OSID)  
**Approximate lines:** 190–257

### Guard Logic

Each turn, when processing a brigade that is already on a sector front OSID and has no march in
flight, the guard fires an eviction check if ALL five conditions hold:

```
isRetroactiveTooth(loc, subSegment)
  AND isMovementDestinationRisky(loc, graphAnalysis)
  AND !pendingMove
  AND loc NOT IN must_hold_osids_by_corps
  AND brigade.disrupted_turns == 0
```

**Condition 1 — Retroactive tooth:** The brigade's current OSID is the sole `friendly_osid` in
its sub-segment. This is the structural signal that the front has collapsed around the position.

**Condition 2 — Risky position:** `isMovementDestinationRisky` returns true when the OSID has
≥3 enemy neighbors OR ≤1 friendly neighbor. This prevents eviction from positions that are a
sole OSID in a sub-segment but are not actually exposed (e.g. a newly-formed small sector that
has not yet been reinforced).

**Condition 3 — No march in flight:** If `pendingMove` is set, the brigade is already relocating.
Issuing a second march would conflict with the in-flight order.

**Condition 4 — Not must_hold:** Positions listed in `must_hold_osids_by_corps` must be held
regardless of sub-segment size. The guard respects strategic designation.

**Condition 5 — Not disrupted:** A disrupted brigade (`disrupted_turns > 0`) cannot march safely.
The check is deferred until disruption resolves.

### Eviction Destination

When the guard fires, the eviction destination is the nearest safe corps-wide front OSID — the
same pattern used by the existing trap-remediation march logic. The search excludes:

- OSIDs that are themselves risky teeth (avoids routing into another isolated position)
- OSIDs occupied by brigades already in column march (avoids traffic conflicts)

If no safe destination exists — the brigade is fully trapped with no reachable safe front OSID —
the march is suppressed and the brigade holds in place. Eviction into a worse position is not
issued.

---

## 4. 444th Mountain: Outcome Trace

**Brigade:** 444th Mountain Brigade (RBiH)  
**Initial position:** `op:kalinovik:sela_2` (valid at march time, became sole OSID after RS captures)

| Turn | Location | Event |
|---|---|---|
| T5 | kruzanj_2 | decisive_victory |
| T21 | sela_2 | costly_victory |
| T27 | mazlina | repulsed |
| T27 | golubici_2 | stalemate |
| T38 | delijas | stalemate |
| T40 | delijas | stalemate |

The guard evicted the 444th from `sela_2`. Final location: `op:trnovo:delijas`. `sela_2` controller
at end of run: **RS**.

### Acceptance Bar (n1349)

All three architect criteria are met:

1. ✓ 444th no longer holds `sela_2` — retrograded, `sela_2` is RS
2. ✓ Concrete rule governs retroactive exposed holds
3. ✓ Better than tile-filling: brigade no longer occupies an isolated 8-edge position to satisfy
   sector coverage

---

## 5. Tests

**File:** `tests/retroactive_tooth_eviction.test.ts` (7 tests)

| Test | What it proves |
|---|---|
| T1 | Eviction fires for retroactive tooth (sole friendly_osid + risky) |
| T2 | `must_hold` suppresses eviction |
| T3 | March in flight (`pendingMove` set) suppresses eviction |
| T4 | Multi-OSID sub-segment skips guard entirely |
| T5 | Trapped brigade (no safe destination) holds in place — no march issued |
| T6 | Disrupted brigade (`disrupted_turns > 0`) suppresses eviction |
| T7 | Cut-off risk alone (≤1 friendly neighbor) triggers eviction without full encirclement |

**Full suite:** 2923/2923 passed (204 files, 0 failures)

---

## 6. Verification Results (n1349)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean — 0 errors |
| `npm run test:vitest` | **2923/2923 passed**, 204 files |
| Area-weighted calibration | **94.0%** (n1348 baseline: 93.6%, delta **+0.4pp** — ATH for session) |
| Anchors | **27/27** (maintained) |
| Benchmarks | **6/6** (maintained) |
| Battles | **59** (+13 vs n1348) |
| Destroyed brigades | 3 (1× RS 1st Bratunac T17, 2× HRHB pocket brigades) |
| 444th Mountain final location | `op:trnovo:delijas` — **NOT sela_2** |
| sela_2 controller at end | **RS** |

### War-or-Game Assessment (n1349)

**P1** — unchanged from n1348 but for a different reason.

The eviction guard is correct behavior. The residual P1 is that the corps assignment system routed
the 444th into another isolated sole-OSID sub-segment (`delijas`: 5 RS-facing edges, threat ratio
48.52, no reserve). The guard evicted the brigade from one tooth and the sector system placed it on
another.

The eviction guard cannot fix corps-level reserve allocation — that is a structurally separate
problem in brigade distribution, not march evaluation. It is tracked as an open P1 below.

---

## 7. Residual Risks

| Item | Severity | Notes |
|---|---|---|
| Corps reserve allocation for isolated sectors | P1 | System assigns single brigades to sole-OSID sectors with no reserve. `delijas` case. Separate lane from march evaluation. |
| Eviction fires when brigade should hold (must_hold absent) | P2 | If a position has real strategic value but no `must_hold` flag, eviction fires correctly by the rules but against intent. Mitigation: set `must_hold` for politically non-negotiable positions. |
| Brigade bouncing between isolated positions | P2 | Eviction from one tooth may route to another tooth if the corps holds only tooth-shaped sectors. The safe-front filter (excludes other risky teeth) mitigates but does not eliminate if all available destinations score as risky. |

---

## 8. Relationship to Phase 1

Phase 1 (`20260406_BRIGADE_TRAPPING_CORRIDOR_QUALITY_GUARD.md`) and Phase 2 address different
failure modes that were both observed in the 444th Mountain / 16th Krajina investigation:

| Guard | Failure mode | Layer | File |
|---|---|---|---|
| Phase 1 — Corridor-quality | Brigade marches to position with no real-border corridor at plan time | Planning | `plan.ts`, `emit.ts` |
| Phase 2 — Retroactive tooth eviction | Brigade holds a position whose sub-segment collapses to sole OSID after occupation | March evaluation | `bot_brigade_eval_front.ts` |

Neither supersedes the other. Together they close the two structural paths to Brigade Trapping:
the forward path (bad plan) and the residual path (valid plan, terrain shifted).
