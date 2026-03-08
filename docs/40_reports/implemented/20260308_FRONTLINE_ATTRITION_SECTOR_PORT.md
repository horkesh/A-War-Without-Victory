# Frontline Attrition: Sector Port (corps_front_sectors)

**Date:** 2026-03-08
**Run:** n366 (88.2% area-weighted)
**File:** `src/sim/combat/frontline_attrition.ts`

## Summary

Frontline attrition ported from the legacy `brigade_front_assignment` + `local_fronts` system to the new `corps_front_sectors` system. The module now determines which brigades take passive attrition based on sector territory membership (`assigned_brigade_ids`) rather than legacy front-ID string parsing.

## Before (legacy)

- Iterated `state.brigade_front_assignment` (a map of formationId to frontId)
- Used `state.local_fronts[frontId]` for density (`assigned_brigade_ids.length / coverage_length`)
- `isColdFront()` parsed legacy front_id strings like `"HRHB__RS__osid1__osid2"` for Graz Accords detection
- All brigades with ANY front assignment took attrition regardless of physical position

## After (corps_front_sectors)

- Builds `brigadeSector` lookup from `sector.assigned_brigade_ids` across all `state.corps_front_sectors`
- A brigade takes frontline attrition if it appears in any sector's `assigned_brigade_ids` (meaning its `location_osid` is within the sector's `territory_osids` -- verified by `classifyBrigadesByTerritory()` each turn)
- Reserve brigades (not in any sector territory) are exempt
- Density modifier uses sector data: `sector.assigned_brigade_ids.length / sector.length_edges`
- `isColdFront()` rewritten to use structured `CorpsFrontSector` data (`faction`, `opposing_factions`, `sub_segments`) instead of parsing front_id strings
- Kiseljak exclusion checks sector's `sub_segments[].friendly_osids` for excluded OSIDs

## Entrenchment reduction (added in same session, before the port)

- Both base attrition and bombardment exposure now scaled by entrenchment modifier
- `entrenchmentMod = max(0.40, 1.0 - sqrt(entrenchment_turns) * 0.10)`
- At 6 turns: 24.5% reduction. At 20 turns: 44.7%. At 52 turns: 60% (floor)

## Key design decision: assigned_brigade_ids vs friendly_osids

The first attempt used `sub_segments[].friendly_osids` (border-adjacent OSIDs only) -- this was too narrow:

- Only 55% of RBiH, 64% of RS, 21% of HRHB brigades were at border-adjacent OSIDs
- Casualties dropped ~50% -- unrealistic

The final implementation uses `assigned_brigade_ids` -- any brigade physically in the sector's territory takes attrition. This matches the old system's intent (all sector-assigned brigades are "on the front") while being structurally correct (location-validated by `classifyBrigadesByTerritory()`).

## Pipeline ordering

- `partition-corps-front-sectors` runs at war_phases.ts line 473
- `apply-frontline-attrition` runs at war_phases.ts line 1000
- Sectors are fully computed before attrition -- no ordering issue

## Calibration results (n366)

| Region | Score |
|--------|-------|
| KRAJINA | 97.9% |
| HERZEGOVINA | 91.5% |
| CORRIDOR | 88.1% |
| CENTRAL_BOSNIA | ~83% |
| DRINA | ~74% |
| **Area-weighted** | **88.2%** |

| Faction | KIA | Personnel | Target |
|---------|-----|-----------|--------|
| RBiH | 8.8k | 127.2k | 120k |
| RS | 8.9k | 105.9k | 102.6k |
| HRHB | 1.2k | 44.5k | 41.5k |

- RS delta: -70 (persistent gap -- RS aggression recalibration still needed)
- KIA lower than n345 (11.3k/13.7k/1.6k) due to entrenchment reduction -- expected and correct

## What was NOT removed

`brigade_front_assignment` and `local_fronts` still exist in the codebase -- used by:

- `front_assignment.ts` (ensureBrigadeFrontAssignments)
- `local_front_defense.ts` (getLocalFrontDensityModifier path 1)
- `formation_fatigue.ts` (isFrontAssigned for +0.5/turn frontline fatigue)
- GUI (GameStateAdapter), serialization, scenario_end_report

These are candidates for future migration but out of scope for this change.

## Canon propagation

- Systems Manual v0.6.0 section 7.4 (frontline attrition entrenchment reduction paragraph)
- context.md (war phase spatial model, cold-front attrition exemption)
- CALIBRATION_MASTER.md (latest run, constants)
- PROJECT_LEDGER.md (chronological entry)
- PROJECT_LEDGER_KNOWLEDGE.md (section 10, Sectors & Operations)
- CONSOLIDATED_IMPLEMENTED.md (row)
