# Loaned Elite Rescue Pass — RS 65th Unresolved Sector Fix
## Supersedes: 20260410_UNRESOLVED_SECTOR_VALIDATOR_ARMY_HQ_EXEMPTION.md

**Date:** 2026-04-10
**Commit:** `dc742d9e`
**Baseline:** n1413 — hash `8e7acaa0d71e95c9`, validator FAIL (1 unresolved)
**Post-fix:** n1420 — hash `d50c2b19d8b27628`, validator PASS (0 unresolved)
**vitest:** 3140/3140 (247 files)
**tsc:** Clean
**build:** Clean

---

## 1. Why the Previous Fix Was Wrong

Commit `bb454db4` added an `ARMY_HQ_CORPS` filter to `validate_run_consistency.cjs` that exempted all army HQ brigades from the unresolved check by `corps_id` alone. This was rejected because:

- The sim's `collectUnresolvedSectorBrigades()` deliberately includes loaned army HQ brigades (`isSectorAssignmentExemptCorpsId(corpsId) && !loaned`)
- The validator filter suppressed the exact case the sim intentionally surfaces
- The fix papered over a real sim gap instead of addressing it

---

## 2. Root Cause (Traced)

`rs_65th_protection_motorized_regiment` (vrs_main_staff, on elite loan to vrs_sarajevo_romanija) at `op:sokolac:sokolac_2`:

1. **Phase 0a:** loanedCorpsMap built — 65th mapped to `vrs_sarajevo_romanija`
2. **Phase 1:** sokolac_2 not on any sector front → skipped
3. **Phase 1.5:** sokolac_2 in SRK territory but front-unreachable within TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS → pushed to remaining
4. **Phase 2:** BFS from sokolac_2 to sector fronts fails (component-separated, `brigComp=-2`) → unmatched
5. **Loaned-elites pass:** Also `brigComp=-2` — no same-component SRK sector found → not placed
6. **Post-processing merge/seal passes:** Even if placed, sealMergedSectorTruth rebuilds assignments and discards the placement
7. **`collectUnresolvedSectorBrigades`:** sokolac_2 IS in final sector:vrs_sarajevo_romanija:5 territory → `brigadeRequiresSectorAssignment` returns true → brigade accused as unresolved

**Component -2 cause:** `buildFriendlyComponents` builds friendly-connected components. sokolac_2 is deep RS rear territory — not connected to any front-adjacent friendly OSID via the adjacency map's BFS. It gets `componentOf = undefined` → default `-2`.

**Cross-faction noise:** The loaned-elites pass iterated ALL factions' loaned brigades without faction filtering. The 65th (RS) was processed during RBiH/HRHB passes where zero SRK sectors exist.

---

## 3. Audit Decision

### Candidate seams considered

1. **Validator too broad (bb454db4)** — WRONG. Hid a real sim gap.
2. **Loaned-elites pass territory fallback** — INSUFFICIENT. Merge/seal passes undo the placement.
3. **`brigadeRequiresSectorAssignment` component-awareness** — Too invasive (requires signature change).
4. **Rescue pass after merge/seal** — CHOSEN. Runs after all destructive passes, assignment sticks.

### Exact seam chosen

Add `rescueUnassignedLoanedElitesInTerritory()` in `corps_front_sectors.ts` after the last `sealMergedSectorTruth` call and before `collectUnresolvedSectorBrigades`.

### Why it wins

- Runs AFTER all merge/seal passes — assignment cannot be undone
- Only fires for loaned elites in target-corps territory — narrow scope
- Assigns as reserve (not front-line) — honest about the brigade's position
- Deterministic (sorted iteration, strictCompare tiebreaker)
- No new generic contract — targeted repair for a specific lifecycle gap

---

## 4. Changes

### `src/sim/combat/corps_front_sectors.ts`
- Added `rescueUnassignedLoanedElitesInTerritory()`: iterates loaned elites not yet assigned, checks if location is in target-corps sector territory, assigns as reserve
- Called after `pruneGhostArtifactSectors` and before `syncSectorAssignmentsToFormations`

### `src/sim/combat/brigade_assignment.ts`
- Added faction filter to loaned-elites pass: `if (!loanedFormation || loanedFormation.faction !== faction) continue;` — prevents cross-faction noise
- Removed dead territory fallback from loaned-elites else branch (merge/seal undoes it)

### `tools/validate_run_consistency.cjs`
- Reverted `bb454db4`: removed `ARMY_HQ_CORPS` exemption. Validator is strict again — all `unresolved_sector_brigades` entries are hard failures. The sim now correctly resolves the 65th so no exemption is needed.

---

## 5. Verification

| Check | Before (n1413) | After (n1420) |
|---|---|---|
| Validator | FAIL: rs_65th unresolved | PASS: 0 unresolved |
| Hash | `8e7acaa0d71e95c9` | `d50c2b19d8b27628` |
| 65th assignment | null | `{ kind: 'sector', role: 'reserve', sector_id: 'sector:vrs_sarajevo_romanija:5' }` |
| 65th in sector | none | reserve in sector:vrs_sarajevo_romanija:5 |
| unresolved_sector_brigades | `['rs_65th_protection_motorized_regiment']` | `[]` |
| vitest | 3140/3140 | 3140/3140 |
| tsc | clean | clean |
| build | clean | clean |

**The fix changes scenario behavior** — the 65th is now assigned as reserve, which changes the final state hash. This is correct: the brigade was genuinely unplaced before and is now truthfully assigned.

---

## 6. Canonical Owner After Cleanup

`rescueUnassignedLoanedElitesInTerritory` in `corps_front_sectors.ts` — final-pass territory rescue for loaned elites dropped by merge/seal.

## 7. Demoted Path

- `bb454db4` validator corps-id-only exemption — reverted (was wrong)
- Loaned-elites pass territory fallback in `classifyBrigadesByTerritory` — removed (merge/seal undoes it)

## 8. Residual Risks

1. **Other loaned elites outside territory:** If a loaned elite is NOT in any target-corps sector territory, the rescue pass won't fire. They would still be unresolved. This is correct — if the brigade isn't even in the right territory, it's a genuine placement issue.
2. **Component -2 for deep rear OSIDs:** The friendly-component BFS doesn't reach deep rear OSIDs that aren't adjacent to any front. This is a pre-existing property of the component system, not a new issue.
3. **`rs_1st_guards_motorized`:** Also loaned elite with `brigComp=-2` in logs — may have a similar pattern. Not in `unresolved_sector_brigades` at end-of-run (likely recalled before final turn or in territory of a matching sector).
