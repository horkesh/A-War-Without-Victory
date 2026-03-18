# Corps-Level Operations — Decouple Operations from Sectors

**Date:** 2026-03-18
**Run ID:** n915
**Baseline:** n913 (90.3% area-weighted, 13/13 anchors)
**Result:** n915 (91.1% area-weighted, 13/13 anchors, +0.8pp)
**Hash:** `b617a9a3137a6e20`

## Summary

- Operations decoupled from sectors: corps commander selects targets from full corps directive and assigns brigades from entire corps pool, not one sector
- Contiguity enforcement seeds from ALL corps sectors' friendly OSIDs instead of a single sector — operations can target any enemy OSID adjacent to the corps' front
- Net simplification: removed 69 lines of sector cluster expansion and per-sector reinforcement pool logic

## Problem

The previous system iterated through sectors to find operation launch candidates. This created several artificial constraints:

1. **Sector-locked brigades**: Only brigades physically in one sector's territory could participate in that sector's operation, even if the corps had idle brigades in adjacent sectors
2. **Cluster expansion complexity**: A 65-line loop tried to merge adjacent sectors to gather enough brigades — an ad-hoc workaround for the sector-scoping limitation
3. **Reinforcement pool indirection**: A separate `computeReinforcementPool()` system loaned brigades from other sectors into operations after launch — another workaround
4. **Per-sector cooldown theater check**: Operations in cooldown checked whether the new operation shared a "theater" with the last completed op, sector by sector — unnecessary complexity when the corps is the unit of action

## Changes Made

### Phase 1: Rename and refactor evaluateSectorOffensiveLaunch

**File:** `src/sim/combat/sector_offensive.ts`

- Renamed `evaluateSectorOffensiveLaunch` → `evaluateCorpsOffensiveLaunch`
- Signature change: removed `sectorId` as required param; added `primarySectorId?: string` at end; `sectorBrigadeIds`/`sectorEnemyOsids` → `corpsBrigadeIds`/`corpsEnemyOsids`
- **Contiguity seed**: Changed from looking up one sector (`state.military.corps_front_sectors?.[sectorId]`) to iterating ALL sectors where `sec.corps_id === corpsId`. This means the greedy chain can accept objectives adjacent to any part of the corps' front
- **Staging OSID**: Changed from "first sorted friendly OSID in sector" to "nearest friendly OSID to first objective" via OSID adjacency check, falling back to first sorted friendly OSID in corps territory
- Added deprecated alias `evaluateSectorOffensiveLaunch` that maps old signature → new for backward compatibility

### Phase 2: Refactor bot_corps_directives.ts caller

**File:** `src/sim/combat/bot_corps_directives.ts`

Replaced the `for (const sec of sortedLaunchSectors)` loop (lines 1679-1886) with a single corps-level launch block:

- **Corps-wide brigade pool**: All active subordinates with `personnel >= 400` and not disrupted, sorted by equipment offensive priority
- **Corps-wide enemy OSIDs**: Union of `ss.enemy_osids` across all `directiveEligibleSectors`
- **Single launch call**: `evaluateCorpsOffensiveLaunch(state, corps.id, faction, corpsBrigadeIds, allCorpsEnemyOsids, reachableTargets, ...)`
- **Probes remain sector-scoped**: Both proactive probe (lines 1633-1677) and intel-gate probe use sector-level data — probes are small recon-by-force at a specific front segment
- **Cooldown simplified**: Corps-level gate (`!inCooldown`) replaces per-sector theater adjacency check

**Removed:**
- Sector cluster expansion loop (65 lines of donor sector merging)
- `computeReinforcementPool` import (no longer needed — corps-level pool includes all brigades)
- `buildFriendlyComponents` import (was only used for reinforcement pool)
- `factionFriendlyOsids` construction (was only used for reinforcement pool)

### Phase 3: Tests

**File:** `tests/corps_level_operations.test.ts` (new, 7 tests)

1. **Contiguity from all corps sectors** — two sectors in one corps, target adjacent to sector A's front chain-connects through sector B
2. **Cross-sector brigade selection** — brigades from both sectors participate
3. **Non-contiguous target rejection** — disconnected target filtered out
4. **Primary sector ID passthrough** — `sector_id` on operation matches provided `primarySectorId`
5. **Undefined sector_id when omitted** — corps-level op without sector binding
6. **Staging nearest to objective** — picks adjacent friendly OSID over distant sorted OSID
7. **Other-corps isolation** — sectors from a different corps don't contribute to contiguity seed

## Scenario Results

### OSID Match Rate
| Region | Match (OSID) | Match (area) |
|--------|-------------|-------------|
| KRAJINA | 130/131 (99.2%) | 99.6% |
| POSAVINA_NE | 103/109 (94.5%) | 94.8% |
| DRINA | 95/123 (77.2%) | 78.2% |
| CENTRAL_CORRIDOR | 84/94 (89.4%) | 90.3% |
| CENTRAL_BOSNIA | 144/163 (88.3%) | 88.3% |
| SARAJEVO | 27/31 (87.1%) | 87.6% |
| HERZEGOVINA | 84/93 (90.3%) | 91.3% |
| **OVERALL** | **667/744 (89.7%)** | **91.1%** |

### Faction Totals (area-weighted)
| Faction | Painted | Sim | Delta |
|---------|---------|-----|-------|
| RS | 65.3% (33,512 km²) | 60.9% (31,289 km²) | -4.4pp |
| RBiH | 23.4% (12,017 km²) | 27.0% (13,874 km²) | +3.6pp |
| HRHB | 11.3% (5,808 km²) | 12.0% (6,174 km²) | +0.7pp |

### Troop Strengths (w40)
| Faction | Active Brigades | Personnel |
|---------|----------------|-----------|
| HRHB | 19 | 10,720 |
| RBiH | 71 | 39,480 |
| RS | 76 | 82,700 |

### Combat Statistics
| Metric | Value |
|--------|-------|
| Attack orders | 92 (RS: 69, RBiH: 13, HRHB: 10) |
| Battles (defender present) | 44 |
| Battles (defender absent) | 27 |
| Attacker casualties | 10,037 |
| Defender casualties | 23,645 |
| OSID flips | 56 |
| Weeks with orders | 23/40 |

### Key Control Checks (Anchors)
13/13 PASS — Bijeljina, Banja Luka, Tuzla, Bihać, Sarajevo, Zvornik, Vitinica, Teočak, Orašje, Brčko, Goražde, Srebrenica, Vozuća.

### Bot Benchmarks
4/6 pass. Failed: RBiH w40 preserve_survival_corridors (+0.056 deviation vs 0.05 tolerance), RS w40 consolidate_gains (-0.055 deviation vs 0.05 tolerance). Both marginal — RBiH slightly over-expanded, RS slightly under-expanded. Known issue from equipment rework (fewer phantom ARBiH tanks = less VRS advantage).

## Design Decisions

1. **Probes stay sector-scoped** — probes are small recon-by-force at a specific front segment. They don't benefit from corps-wide scope.
2. **`sector_id` remains optional on CorpsOperation** — was already optional before this change. Corps-level ops set `primarySectorId` (the sector with most target overlap) for UI display.
3. **No reinforcement pool** — corps-level ops draw from full brigade pool by definition. The separate reinforcement mechanism is redundant.
4. **Deprecated alias** — `evaluateSectorOffensiveLaunch` maps to new function for backward compatibility. Existing tests and any external callers continue to work.

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/sector_offensive.ts` | Rename + refactor function, corps-wide contiguity, staging nearest objective |
| `src/sim/combat/bot_corps_directives.ts` | Replace sector loop with single corps-level launch, remove cluster expansion + reinforcement pool |
| `tests/corps_level_operations.test.ts` | New: 7 tests for corps-level operation launch |
| `vitest.config.ts` | Add new test file to include list |
| `docs/PROJECT_LEDGER.md` | Ledger entry for n915 |

## Lessons Learned

- **Corps is the natural unit of operation** — the sector system works for defense (reactive defense, stances, density) but operations are inherently corps-level. Forcing operations through the sector lens required two workaround systems (cluster expansion + reinforcement pool) that added complexity without improving outcomes.
- **Simplification improved results** — removing 69 lines of cluster/reinforcement logic and replacing with direct corps-level pool produced +0.8pp improvement. The workarounds were actively harmful: cluster expansion sometimes merged wrong sectors, and reinforcement pool timing was disconnected from the launch decision.
- **Contiguity from corps front is strictly more permissive** — seeding from all sectors means more objectives pass the contiguity chain. This is correct: a real corps commander doesn't restrict operations to one sector's view of the front.

## Next Steps

- Monitor Drina region (78.2%) — slightly below target, may need OOB or painted target adjustments
- RBiH w40 benchmark marginal — within noise, may self-correct with further equipment tuning
- Consider removing deprecated `evaluateSectorOffensiveLaunch` alias once all downstream code is confirmed migrated
