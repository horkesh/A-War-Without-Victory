# Session Report: Posavina Corridor + Settlement Timeline + Map Overhaul

**Date:** 2026-03-21
**Baseline:** n998 = 91.0% area-weighted, 3/4 enclaves
**Result:** n1020 = **93.1% area-weighted** (new ATH), **4/4 enclaves**, RS w40 0.511 PASS
**Tests:** 1261 pass, 106 suites, tsc clean

## Summary

- **Posavina Corridor restructure** — Operation Corridor 92 now produces historically accurate corridor opening. Bosanski Brod falls at w27 (historical: w28).
- **Settlement Timeline** — "The Story of This Place" — 12 event types tracking everything that happens at each OSID, powered by 5 new engine persistence features.
- **Map improvements** — Deck.gl settlement labels (bypassing broken MapLibre symbols), units toggle fix, 30° pitch, scroll bounds.
- **Displacement fix** — found and fixed a double-counting bug in the adapter that was inflating OSID displacement numbers by ~40%.

---

## 1. Posavina Corridor Restructure (n1002)

### Problem
Op Derventa (triggered, w4) sent 2 VRS brigades to capture derventa_2. Captured at w5 but HRHB retook — 2 brigades can't hold against 6 HVO brigades arriving w8. Historically, VRS launched Corridor 92 at w12 with 50,000+ troops across two corps (BB1 pp.181-183).

### Historical Research (Historian + War-or-Game)
- Operation Corridor 92 was VRS's #1 strategic priority — "most important" 1992 campaign (BB1 p.177)
- 1KK under General Talić launched 24 June after preliminary ops cleared Doboj-Derventa corridor
- Modriča fell 28 June, Derventa 4-5 July, Odžak 12 July, Bosanski Brod 6 October
- "Most of the VRS's battle-tested former JNA units" committed (BB1 p.183)
- VRS achieved victory over "experienced and numerically superior" HVO/HV forces

### Changes
1. **Removed** triggered Op Derventa (w4, 2 brigades) — historically wrong timing
2. **Strengthened** 1KK pre-planned Op Corridor:
   - Added 3 brigades redeployed from Op Prijedor: 16th Krajina Motorized, 5th Kozara Light Infantry, 1st Trebava Infantry
   - Total: 5 brigades on Corridor East axis (~5,600 pers) + 1st Doboj on Corridor South
   - Added `min_attack_outcome: 'repulsed'` — existential operation
3. Combined with EBK's 3 Posavina brigades: **9 VRS brigades (~8,200 pers) vs ~5,350 HVO**

### Emergent Result
| Event | Sim Week | Historical Week |
|-------|----------|-----------------|
| Modriča fell | w10 (decisive) | ~w12 |
| Odžak fell | w12 (costly) | ~w14 |
| Derventa fell | w18-19 (stalemate→costly) | ~w13-14 |
| **Bosanski Brod fell** | **w27** | **w28** |
| Orašje holds | ✓ | ✓ (VRS Nov offensive failed) |

No hardcoded OSID flips — pure emergent outcome from correct force concentration.

### REAL_WAR_MASTER
Issue #34 (Corridor 92 doesn't happen) → **FIXED**.

### Files
- `src/sim/combat/triggered_operations.ts` — Op Derventa removed
- `src/sim/combat/pre_planned_operations.ts` — Op Corridor strengthened

---

## 2. Settlement Timeline — "The Story of This Place"

### Feature
Vertical scrollable timeline in the settlement panel showing chronological history of everything that happened at an OSID. Replaces the Orders & Events tab. 12 event types, phase-aggregated displacement, real dates (not week numbers), color-coded cards.

### Event Types (12/12 wired)

| # | Type | Icon | Source | Status |
|---|---|---|---|---|
| 1 | control_flip | ⚑ amber | control_events | ✅ |
| 2 | battle | ⚔ red | turn_summaries.battles | ✅ |
| 3 | displacement | → orange | displacement_event_log (phase-aggregated) | ✅ |
| 4 | civilian_killed | † dark red | displacement_event_log | ✅ |
| 5 | brigade_arrived | ▲ green | turn_summaries.movements | ✅ |
| 6 | brigade_departed | ▼ gray | turn_summaries.movements | ✅ |
| 7 | siege_began | ◉ red | turn_summaries.supply_transitions | ✅ |
| 8 | supply_restored | ◈ green | turn_summaries.supply_transitions | ✅ |
| 9 | operation_target | ⊕ blue | operation_history | ✅ |
| 10 | operation_resolved | ✓ blue | operation_history | ✅ |
| 11 | ethnic_shift | ◐ purple | computed from displacement | ✅ |
| 12 | historical_event | ★ yellow | turn_summaries.events_fired | ✅ |

### Engine Tracking (5 new persistence features)

1. **control_events** — stopped trimming to last 3 turns + emit from all 5 control flip paths (was only 2/5). 120 events in a 40w run.
2. **turn_summaries** — raised MAX_TURN_SUMMARIES from 3 to unlimited. 85 battles preserved across 40 turns.
3. **Brigade movements** — `captureAARSnapshot` records `formation_locations`. `compileTurnSummary` diffs to produce movement records. 569 movements in a 40w run.
4. **Supply transitions** — persist `last_supply_state_by_osid` on PoliticalState. Snapshot + diff produces per-OSID transitions. 160 transitions in a 40w run.
5. **Historical events** — `events_fired` from TurnReport now persisted on TurnSummary. 20 events in a 40w run.

### Example: Derventa Timeline
```
6 Apr 1992:  operation_target   Operation Koridor launched
11 May 1992: control_flip       HVO took control
11 May 1992: displacement       4,787 Serbs displaced
17 Aug 1992: battle             Battle — stalemate (VRS vs HVO)
24 Aug 1992: battle             Battle — costly victory, territory captured
24 Aug 1992: brigade_arrived    1st Trebava Infantry stationed
21 Sep 1992: control_flip       VRS took control
21 Sep 1992: displacement       5,833 Croats displaced (over 17 weeks)
21 Sep 1992: ethnic_shift       Ethnic majority shifted — Croat → Bosniak
```

### Files
- `src/ui/map/components/SettlementTimeline.tsx` — new component
- `src/ui/map/utils/buildSettlementTimeline.ts` — timeline builder (12 event types)
- `src/ui/map/components/SettlementDetailContent.tsx` — tab replacement + wiring
- `src/ui/map/components/SelectionPanel.tsx` — data passthrough
- `src/ui/map/data/types.ts` — new LoadedGameState fields
- `src/ui/map/data/GameStateAdapter.ts` — 6 new extraction functions
- `src/state/game_state.ts` — `last_supply_state_by_osid` field
- `src/state/turn_summary.ts` — `movements`, `supply_transitions`, `events_fired` fields
- `src/sim/compile_turn_summary.ts` — `compileMovements`, `compileSupplyTransitions`
- `src/sim/turn_pipeline_types.ts` — `formation_locations`, `supply_state_by_osid` on AARSnapshot
- `src/sim/turn_phases/war_phases.ts` — persist supply state, stop control event trimming
- `src/sim/combat/rear_pocket_consolidation.ts` — emit control_event
- `src/sim/combat/sector_offensive.ts` — emit control_event (2 paths)
- `src/sim/combat/jna_phantom_brigades.ts` — emit control_event

---

## 3. Map Improvements

### Deck.gl Settlement Labels
MapLibre's symbol rendering pipeline is globally broken — "Unimplemented type: 4" errors from OSM PMTiles cause ALL symbol layers to render 0 features (confirmed via `queryRenderedFeatures`). Bypassed with Deck.gl `TextLayer` for 27 major settlement labels. SDF outlines, auto charset for Bosnian diacritics (Ć, Š, Č, Ž), zoom-scaled 10-20px. Sarajevo's 5 municipality labels merged into one.

### Units Toggle Fix
Deck.gl layers were only recomposed on zoom events, not when `formationsVisible` toggled. Added reactive `useEffect`.

### terrain-dem Removal
Removed `terrain-dem` source from style JSON — was unused on main map but triggered `setTerrain` during style loading.

### Files
- `src/ui/map/layers/buildTacticalDeckLayers.ts` — Deck.gl TextLayer + `setSettlementLabelData`
- `src/ui/map/map/MapContainer.tsx` — label data wiring, units toggle useEffect, terrain-dem removal
- `src/ui/map/map/awwv_map_style.json` — terrain-dem source removed
- `src/ui/map/map/builders/buildMajorCityLabelGeoJSON.ts` — Sarajevo merge

---

## 4. Settlement Panel Overhaul

### Tab Restructure
- **Military tab removed** — stationed units and sector info moved to Overview
- **Municipality tab added** — mun-level population, displacement, pre-war + current ethnic structure
- **Orders & Events tab → Timeline tab**

### Ethnic Structure
- All ethnic bars now show absolute numbers + percentages (was % only)
- Municipality tab has pre-war AND current ethnic structure aggregated across all OSIDs
- Current ethnic computed by subtracting per-OSID departures from pre-war populations

### Political Control Row
Removed from Overview tab (redundant with header faction flag).

---

## 5. Displacement Double-Counting Fix

### Root Cause
The adapter aggregation at `GameStateAdapter.ts:1460` was:
```js
out = displaced + killed + fledAbroad  // WRONG — double counts
```

The displacement event log's `displaced` field means **total people removed** from the OSID. `killed` and `fled_abroad` are **subsets** of `displaced`, not additional amounts. The adapter was adding them all, inflating OSID displacement by ~40%.

### Impact
Derventa OSID showed 25,202 total removals from 21,706 pre-war population (impossible). Fixed to 18,575 (correct — 86% of population displaced).

### Fix
```js
out = displaced              // total removals (correct)
lost = killed + fledAbroad   // subset of out
```

Same fix applied to `departedByOsid` ethnic tracking.

### Population Formula
Also fixed earlier in the session: `Now = pre - out + in` (was `pre - out - lost + in`, double-subtracting lost).

---

## Calibration Results

### n1020 (main, post-merge)

| Metric | Value |
|--------|-------|
| **Area-weighted** | **93.1%** (new ATH) |
| OSID count match | 644/712 (90.4%) |
| RS w40 | 0.511 PASS |
| RBiH w40 | 0.371 PASS |
| Enclaves | **4/4** (Srebrenica, Goražde, Bihać, Žepa) |

### Regional Breakdown

| Region | Match | Area |
|--------|-------|------|
| Krajina | 99.2% | 99.6% |
| Posavina NE | 96.2% | 96.1% |
| Drina | 76.8% | 80.5% |
| Central Corridor | 89.1% | 90.3% |
| Central Bosnia | 87.7% | 90.1% |
| Sarajevo | 83.3% | 86.8% |
| Herzegovina | — | — |

### Remaining Benchmark Failures
- RS w20: 0.499 (needs ≥0.54) — early-war RS underperformance
- RS delta: 0 (needs ≤-10) — RS not losing enough late-war
- RS peak: w30 (needs ≤w25) — RS peaks too late

---

## Lessons Learned

1. **Displacement event semantics**: `displaced` = total removed, `killed`/`fled` = subsets. This was a long-standing bug affecting all OSID population displays.
2. **MapLibre symbol layers are globally broken** in this build — every single symbol layer renders 0 features. Root cause likely PMTiles geometry type errors. Deck.gl TextLayer is the workaround.
3. **turn_summaries and control_events were trimmed** — same pattern. Both now persist full history for the timeline.
4. **Operation force concentration matters** — 2 brigades at w4 vs 9 brigades at w12 is the difference between ahistorical and historically accurate.

---

## Next Steps

1. RS w20 benchmark — early-war RS underperformance needs investigation
2. Drina region (80.5%) — lowest regional score, room for improvement
3. Engine: per-OSID displacement cap (prevent over-displacement at source)
4. UI: dark outside-BiH mask (attempted, needs proper BiH border polygon)
5. Army HQ Nerve Center (plan exists at `docs/plans/2026-03-21-army-hq-nerve-center.md`)
