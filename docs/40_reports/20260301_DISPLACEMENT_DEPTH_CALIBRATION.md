# Displacement Depth Calibration: Per-OSID Census Data

**Date:** 2026-03-01
**Runs:** n310 (before) → n319 (after)
**Files modified:** `src/state/displacement_takeover.ts`, `src/sim/turn_pipeline.ts`

## Problem Statement

The ethnic map layer (implemented same session) revealed that displacement depth was far too shallow. Key examples:

- **Ljubija** (Prijedor): 80% Bosniak in 1991 census, historically 90-97% displaced by Jan 1993. Sim showed only ~66% displaced — still Bosniak-majority on ethnic map.
- **Kotor Varos**: 90-95% of non-Serbs displaced historically. Sim: Croat majority persisted.

## Root Cause

The displacement engine evenly split municipality population across OSIDs and used municipality-level ethnic share:

```
osidPop = floor(munOriginalPopulation / osidCount)
hostileShare = getDynamicHostileShare(munId, faction, ...)  // municipality average
hostileShare = min(hostileShare, 0.80)
displacementAmount = floor(osidPop * hostileShare)
```

This averaged out per-OSID demographics. Example for Ljubija (Prijedor municipality, 11 OSIDs):

| Metric | Municipality Average | Actual Per-OSID |
|--------|---------------------|-----------------|
| OSID population | 10,231 (112,543 / 11) | 15,677 |
| Hostile share (RBiH) | 0.521 | 0.855 |
| Initial displacement | 5,330 | 13,404 |

The settlement graph passed to `processPhaseIIDisplacementTakeover` already contained per-OSID census data (`population_total`, `population_bosniaks`, `population_serbs`, `population_croats`, `population_others` from `operational_settlements.geojson`) — it was just not being used, because the `settlements` parameter was keyed by SID (raw graph, 5822 entries) rather than by OSID (operational graph, 753 entries).

## Solution

### 1. Per-OSID Census Helpers (`displacement_takeover.ts`)

Two new functions:
- `getOsidCensusPopulation(rec)` — returns `population_total` from settlement record
- `getOsidCensusHostileShare(rec, faction)` — computes faction-aligned share from per-OSID ethnic data (RBiH = bosniak + other, RS = serb, HRHB = croat)

### 2. Branch A & B Updated

Both initial maturation and sustained displacement branches now:
1. Look up OSID in `osidSettlements` (OSID-keyed operational graph)
2. Use actual per-OSID population (fallback: even split)
3. Use actual per-OSID hostile share with 0.95 cap (fallback: municipality-level with 0.80 cap)

### 3. Sustained Pool Fix

Changed `timer.cumulative_displaced = 0` to `timer.cumulative_displaced = displacementAmount` after initial maturation. This prevents double-counting: the sustained pool now knows how many were already displaced in the initial fire.

Without this fix, the initial fire displaced ~100% of the minority, and then the sustained pool tried to displace another ~100% (since it started from zero). Total displacement was 988k — nearly double the correct figure.

### 4. Turn Pipeline: Load Operational Settlements

The displacement step in `turn_pipeline.ts` now also loads the operational settlements graph (`loadSettlementGraph()` without arguments → defaults to operational GeoJSON). This is passed as the `osidSettlements` parameter. A key prefix check (`op:`) validates it's OSID-keyed before use.

## Results Comparison

### Displacement Totals

| Metric | n310 (before) | n319 (after) | Historical target |
|--------|---------------|--------------|-------------------|
| Total displaced | 481,000 | 668,202 | ~1M by Jan 1993 |
| RBiH displaced | 269,000 | 457,716 | ~800k (first year) |
| HRHB displaced | 120,000 | 150,360 | ~150k |
| RS displaced | 37,000 | 60,126 | ~60k |

### Key Municipalities

| Municipality | n310 displaced | n319 displaced | Change |
|---|---|---|---|
| Ljubija initial fire | 5,331 | 13,399 | +151% |
| Ljubija total | 8,311 | 13,399 | +61% |
| Prijedor (all OSIDs) | ~35,000 | 35,426 | ~same |
| Kotor Varos | 10,673 | 16,489 | +55% |
| Brcko | ~30,000 | 43,306 | +44% |
| Bijeljina | ~25,000 | 37,265 | +49% |

### OSID Match Rate

| Metric | n295 (baseline) | n310 | n319 |
|--------|-----------------|------|------|
| Overall match | 85.1% | 86.3% | 86.7% |
| Krajina | 95.5% | — | 95.5% |
| Posavina/NE | 85.3% | — | 84.4% |
| Drina | 71.9% | — | 75.0% |
| Central Corridor | 91.5% | — | 91.5% |
| Central Bosnia | 81.3% | — | 87.3% |

### Benchmarks

All 6/6 pass in n319. Determinism verified (identical hash on second run: `42ad78a39746d166`).

## Ethnic Map Layer (Same Session)

Also implemented in this session: OSID-level ethnic composition for the map's ethnic layer. Previously used uniform municipality-level ratio; now uses per-OSID departure events (from `displacement_event_log`) and per-municipality arrivals. Files: `buildEthnicGeoJSON.ts`, `GameStateAdapter.ts`, `types.ts`, `MapContainer.tsx`.

## Historian Findings (Pyrrhic Team)

| Municipality | Historical displacement % | Category |
|---|---|---|
| Prijedor | 90-97% | Blitz |
| Kotor Varos | 90-95% | Blitz |
| Bijeljina | 70-85% | Sustained Pressure |
| Zvornik | 85-95% | Blitz |
| Foca | 90-97% | Blitz |
| Sanski Most | 85-95% | Blitz |

Two historical phases: concentrated blitz (2-4 months, 70-80% of total) + sustained residual (6-24 months, 10-20%). Our model captures this via: 4-turn delay + single concentrated initial fire + residual sustained displacement.

## Files Changed

| File | Lines changed | Description |
|---|---|---|
| `src/state/displacement_takeover.ts` | +30, ~10 | Census helpers, per-OSID lookup in Branch A/B, sustained pool fix |
| `src/sim/turn_pipeline.ts` | +10 | Load operational settlements, pass as `osidSettlements` |
| `src/ui/map/map/builders/buildEthnicGeoJSON.ts` | rewrite | OSID-level ethnic composition (ethnic layer) |
| `src/ui/map/data/GameStateAdapter.ts` | +20 | Event log scanning, arrivedByFaction extraction |
| `src/ui/map/data/types.ts` | +3 | `departedByOsid`, `arrivedByFaction` |
| `src/ui/map/map/MapContainer.tsx` | +2 | Thread `departedByOsid` to builder |
| `docs/20_engineering/DISPLACEMENT_MASTER.md` | ~15 | Updated calibration table, per-OSID documentation |
