# 2026-04-04 — Command Chain Truth Package Wave 1

## Summary

Hardened frontline/sector assignment truth in three targeted areas: Phase 1.5
territory-based brigade assignment, the `assertBrigadeReachability` diagnostic
now returning actionable results, and canonical documentation of dead-writer
compatibility fields.

## Audit findings confirmed (Phase A)

| Item | Finding | Action |
|---|---|---|
| Phase 1.5 territory assignment | assigns without front-adjacency check | Fixed (B1) |
| assertBrigadeReachability return value | void — logs but does nothing | Fixed (B2) |
| brigade_front_assignment dead writer | confirmed — serialize.ts + _archived only | Documented (B3) |
| ensureMinimumSectorCoverage hop ceiling | undocumented intentional behavior | Documented (B4) |
| Displacement double-count (Phase C) | guard already exists at line 216 | No code fix needed — documented |
| Threat assessment intel-fog | undocumented | Documented (E3) |

### Phase C finding: displacement double-count already guarded

The audit flagged `scenario_reporting.ts:216-231` as a potential double-count.
On inspection, the guard is already in place: the `else` branch reads System C
(settlement_displacement / municipality_displacement) first; System A
(displacement_state) fallback fires only when `municipality_displacement_total === 0`.
`settlement_displacement_count` is NOT incremented from the System A path
(municipality-level proxy only — see line 229 comment). No code change needed.
Two regression tests were added to lock this invariant.

## Files changed

- `src/sim/combat/brigade_assignment.ts` — B1 Phase 1.5 guard + B4 comment
- `src/sim/combat/sector_assertions.ts` — B2 return value
- `src/sim/combat/corps_front_sectors.ts` — B2 caller demote logic
- `src/state/game_state.ts` — B3 expanded dead-writer comment
- `src/ui/map/components/army_hq/generateThreatAssessment.ts` — E3 intel-fog comment
- `tests/sector_frontline_truth_wave1.test.ts` — 9 regression tests (new file)

## B1: Phase 1.5 front-adjacency guard

**Before:** Phase 1.5 in `classifyBrigadesByTerritory` would assign a brigade to
`assigned_brigade_ids` if its `location_osid` was in `sector.territory_osids` and
the component matched — regardless of whether the brigade could actually reach the
sector's front through friendly territory.

**After:** After territory + component match, the guard calls `friendlyDistanceToAny`
(already in scope) with `TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS = 30`. If the BFS
finds no path from the brigade's location to any of the sector's front OSIDs within
30 friendly hops, the brigade is routed to `remaining` (pool for Phase 2 + downstream
repair) rather than being placed in `assigned_brigade_ids`. This prevents deep-rear
brigades from appearing as sector-assigned when they have no viable path to the line.

**Key design decision:** Brigades that fail the front-adjacency check go to `remaining`,
not `reserve_brigade_ids`. Reserve promotion happens downstream in `reclassifyRearBrigades`.
Premature Phase 1.5 reserve insertion causes false state in topologically ambiguous
situations (e.g. brigade adjacent to a different-component sector via friendly territory).

## B2: assertBrigadeReachability return value

**Before:** `assertBrigadeReachability` returned `void`. It logged violations with
`console.error` but left false sector state in place. The log was the only signal.

**After:** Returns `string[]` — the list of unreachable brigade IDs detected.
The caller at `corps_front_sectors.ts:591` uses this list to demote brigades from
`assigned_brigade_ids` to `reserve_brigade_ids`. Does NOT throw — hard-crashing
on a corrupted save is worse than a demoted assignment.

The function still calls `console.error` for diagnostics. The log remains meaningful
and is not the sole signal anymore — it is now accompanied by actual state repair.

## B3: brigade_front_assignment canonical documentation

The field at `game_state.ts:1697` now carries dual comment:
- A `// COMPATIBILITY-ONLY:` block explaining exactly why the field exists, what
  owns its truth, and where to look for the authority (corps_front_sectors).
- The original `/** Legacy compatibility fallback only... */` JSDoc text, preserved
  because `engine_honesty_legacy_contracts.test.ts` asserts its presence as a contract.

Confirmed: no live runtime writer exists outside `src/state/serialize.ts` (compat) and
`src/_archived/` (dead code). The write-path-dead test locks this.

## B4: ensureMinimumSectorCoverage hop ceiling documentation

`bfsToNearestSector` used in `ensureMinimumSectorCoverage` has no explicit hop ceiling
by design — it will traverse the entire connected component if needed. The new comment
explains that when a brigade cannot reach the sector front at all (returns null), the
transfer is skipped and the sector stays understaffed. This is intentional: pulling a
physically unreachable brigade across a disconnected front would manufacture false state.

## E3: generateThreatAssessment intel-fog comment

`sectorIntel` in `generateThreatAssessment.ts` sources from `sector_intel` observation
records (stale, fog-of-war) rather than live engine activity. This is intentional design.
A comment now documents this explicitly so future agents don't "fix" the intentional lag.

## Verification

- `npx.cmd tsc --noEmit`: clean
- `npm run test:vitest`: 2033 pass / 20 fail — all 20 failures confirmed pre-existing
  (stash-verified against baseline commit 442db2cd)
- New test file: 9/9 pass
- `brigade_territory_reconciliation.test.ts`: 21/21 pass (regression confirmed fixed)

## Completion block

```
Canonical owner: corps_front_sectors — sector assignment truth, brigade reachability
Demoted path: Phase 1.5 territory-only assignment without front-adjacency check removed
Player-visible truth: no direct player-visible change; engine now writes less false state into sector truth which flows through to army-HQ frontline mechanics
Canonical UI surface: Army HQ / corps sector displays (downstream of corrected sector data)
Done means: Phase 1.5 cannot assign a brigade to a sector whose front it cannot physically reach; assertBrigadeReachability violations are actioned (demote to reserve), not just logged; brigade_front_assignment is clearly documented as dead; 9 regression tests lock all Wave 1 invariants
```
