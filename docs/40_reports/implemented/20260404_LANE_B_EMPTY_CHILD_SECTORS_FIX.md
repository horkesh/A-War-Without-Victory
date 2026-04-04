# Lane B — Empty Child Sectors After Contiguity Split
**Date:** 2026-04-04  
**Run context:** `n1312` evidence (5 empty contested sectors, 6 undefended front sub-segments, Drina Corps area)  
**Status:** CLOSED — territory-membership pre-pass implemented; 6 regression tests pass; 2307/2307 suite.

---

## Mission Summary

Lane B was opened during the n1312 triage (see `20260404_SECTOR_OWNERSHIP_ZERO_ATTACK_TRIAGE.md`) when it was confirmed that `splitNonContiguousSectors` can emit child sectors with correct front edges but zero brigades. The parent's brigade set is concentrated in one geographic sub-region; the other child inherits the front geometry but receives no defenders. This corrupts frontline integrity, sector-density metrics, and AI force evaluation for the affected corps.

The fix was a territory-membership pre-pass added to `ensureMinimumSectorCoverage` — before the existing Step 1/2 donor-transfer logic runs — that locates brigades physically resident in the zero-brigade child's territory and moves one into it.

---

## Specialists and Evidence

| Specialist | Owned | Evidence produced |
|---|---|---|
| `systems-programmer` | Pipeline order audit, sector ownership invariants | Site 2 (`sector_rearrangement.ts:334`) is dead code. Site 1 pipeline always calls `classifyBrigadesByTerritory` + `ensureMinimumSectorCoverage`. `ensureMinimumSectorCoverage` Step 2 blocked by `> 1` donor guard + BFS disconnection for non-contiguous split products. |
| `gameplay-programmer` | Brigade assignment gap analysis | Phase 1 of `classifyBrigadesByTerritory` exhausts all brigades into largest child via `location_osid` → `frontOsidToSectorIndices`. No brigade enters pool for Phase 1.5. `ensureMinimumSectorCoverage` Step 2 double-blocked: `> 1` guard + cross-component filter fails for disconnected splits by definition. |
| `scenario-creator-runner-tester` | Run evidence, test coverage audit | Existing test: `tests/sector_contiguity_split.test.ts` (8 tests on `splitNonContiguousSectors` itself). No pre-existing test for post-split brigade fill. |
| `technical-architect` | Fix shape decision | Chose Option B2: territory-membership pre-pass at start of `ensureMinimumSectorCoverage`. Rejected Option A (splitter refusal breaks geographic split contract) and Option B1 (cross-component filter blocks it regardless of `> 1` guard). |
| `qa-engineer` | Regression matrix | 6 tests written in `tests/sector_split_brigade_assignment.test.ts`. All 6 pass against live implementation. |

---

## Root Cause

### Phase 1 Exhaustion

`classifyBrigadesByTerritory` Phase 1 maps each brigade to a sector by looking up its `location_osid` in `frontOsidToSectorIndices`. When the parent sector's brigades are all in one geographic sub-region, all of them map to the largest child (which contains those OSIDs). The smaller child — which may have real front edges — receives nothing. No brigade enters the Phase 1.5 pool because all were consumed in Phase 1.

### `ensureMinimumSectorCoverage` Double-Block

After splitting, the zero-brigade child needs to recruit from a sibling. The existing Step 2 in `ensureMinimumSectorCoverage` is structurally unable to help:

1. **`> 1` donor guard:** A donor must have more than 1 brigade to give one up. If the sibling has exactly 1, it is ineligible regardless of the child's need.
2. **Cross-component filter:** Step 2 uses a BFS connectivity check to verify that the donor and recipient share a connected component. Split products are, by definition, in different components — that is why they were split. So the cross-component filter blocks every candidate donor for a non-contiguous split child, regardless of how many brigades the donor holds.

Both blocks apply simultaneously. No existing repair path in the pipeline can fill a zero-brigade split child.

### Why Site 2 Was Not the Fix

`sector_rearrangement.ts:334` contains a secondary call path that was identified as dead code. The live pipeline always routes through the Site 1 path. Fixing Site 2 would have had no effect.

---

## Fix Implemented

**File:** `src/sim/combat/brigade_assignment.ts`  
**Function:** `ensureMinimumSectorCoverage`

A territory-membership pre-pass was inserted before the existing Step 1/2 donor-transfer logic. For each zero-brigade sector that has at least one front edge:

1. Collect sibling sectors from the same corps.
2. For each sibling, find brigades whose `location_osid` is in the zero-sector's `territory_osids` but not on the sibling's frontline.
3. Check that the sibling retains at least 1 brigade after transfer.
4. If a candidate is found, **move** (not copy) one brigade from the sibling's assignment list to the zero-sector.

No BFS is required. Territory membership is the authoritative check: if a brigade's location is already inside the child's territory, it belongs there. The cross-component filter is not applied because territory membership is a stronger predicate than component reachability in this context.

**Brigade stacking watch item result:** Not meaningfully coupled. The fix is a move operation — the brigade is removed from the donor sector before being added to the recipient. No brigade is double-assigned. Stacking count is unchanged.

---

## Regression Coverage

**File:** `tests/sector_split_brigade_assignment.test.ts`  
**Tests written:** 6

The six cases cover:
- Zero-brigade split child is filled from a sibling when a territory-resident brigade exists
- Donor brigade is removed from the sibling (move, not copy)
- Donor retains at least 1 brigade (transfer blocked if donor would be emptied)
- Pre-pass does not fire when the sector already has brigades
- Pre-pass does not fire when the sector has no front edges (non-contested)
- Pre-pass leaves non-split zero-brigade sectors for the existing Step 1/2 logic

All 6 pass against the live implementation.

---

## Verification

| Check | Result |
|---|---|
| `npx.cmd tsc --noEmit -p tsconfig.json` | PASS |
| `npm run test:vitest` | PASS — 2307/2307, 165 test files |
| `npm run build` (tsc) | PASS |
| `powershell -File scripts/repo/check_claude_governance.ps1` | PASS |
| Vite build (`desktop:map:build`) | ENVIRONMENT — vite not in PATH in this shell (consistent with previous sessions; tsc clean is the build truth here) |

---

## Follow-Up Notes

### Residual ZEA Attribution

Now that Lane B is closed, residual ZEA attribution should be re-measured on current `HEAD`. This is the next priority lane. `P14` hardening is already landed and must not be re-opened as future work; any ZEA investigation must start from fresh run evidence against the current engine.

### AAR Provenance Lane

Zero-attack-success operations (`Operation Prijedor`, `Operation Visegrad` from n1312) remain an open provenance defect in `operation_aar.ts`. Classification: AAR/export truth defect, not combat-logic defect. Priority below residual ZEA attribution pass. Do not dismiss as "rear-pocket consolidation, not a bug."

---

## Canonical Completion Block

```text
Canonical owner: src/sim/combat/brigade_assignment.ts — ensureMinimumSectorCoverage territory-membership pre-pass
Demoted path: post-split equalization via same-component BFS transfer (Step 2) — correct for surplus redistribution but structurally blind to disconnected-split children
Player-visible truth: Zero-brigade child sectors from non-contiguous splits are now filled by territory-resident brigades. Undefended frontlines from split products reduced.
Canonical UI surface: Sector density display; corps force evaluation; undefended_front_subsegments anomaly count
Done means: empty_contested_sector count from splitN child sectors drops to 0 in next 40w run; undefended_front_subsegments anomaly count reduces from 6; 2307/2307 pass; 6/6 new regression tests pass.
```
