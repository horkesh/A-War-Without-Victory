# Sector-Facing Intelligence System — Implementation Report

**Date:** 2026-03-05
**Commits:** `9df71c8` (feat), `6385dc2` (refactor)
**Baseline:** Legacy SID-keyed `recon_intelligence.ts` (BFS over canonical SID graph; zero bot consumers; GUI only used `confirmed_empty`)
**Result:** Sector-facing `sector_intel` system fully live; legacy module deleted; 313 vitest tests passing; 40w gate 95.6% (no regression)

---

## Summary

- Replaced the vestigial `recon_intelligence.ts` (SID-keyed BFS, never read by bots, incompatible with OSID-sector world) with a sector-native intelligence model that tracks per-sector-pair confidence, observable strength/posture, and visible enemy brigade IDs.
- Added recon-by-force (combat sets confidence → 1.0) and faction-level recon profiles (ARBiH advantage in passive buildup rate and range baked into constants — no unit-level tags).
- Wired soft intel-weighted target sorting into `bot_corps_ai.ts`: thin sectors preferred (−2), fortress sectors deprioritized (+2). GUI fog-of-war integration (Phase 5 — `visible_brigade_ids` consuming `buildFogOfWarGeoJSON`) deferred to GUI agent.

---

## Changes Made

### Phase 1 — Constants + Types

- **NEW `src/sim/combat/sector_intel_constants.ts`:** `FACTION_RECON_PROFILES` (RBiH: passive=0.30/turn, decay=0.10, range=2; RS/HRHB: 0.20, 0.25, range=1) and four confidence thresholds (`CONFIDENCE_ROUGH_STRENGTH=0.2`, `CONFIDENCE_FRONT_BRIGADES=0.3`, `CONFIDENCE_FULL_STRENGTH=0.5`, `CONFIDENCE_DEEP_INTEL=0.8`).
- **MODIFY `src/state/game_state.ts`:** Added `SectorStrengthCategory`, `SectorPostureObserved`, `SectorIntelRecord` types and `sector_intel?: Record<string, SectorIntelRecord[]>` field.
- **MODIFY `src/state/serializeGameState.ts`:** Added `'sector_intel'` to `GAMESTATE_TOP_LEVEL_KEYS`; removed `'recon_intelligence'`.

### Phase 2 — Engine Module + Pipeline Wiring

- **NEW `src/sim/combat/sector_intel.ts`:**
  - `deriveSectorIntel(state, turn)` — main pipeline function. Reads `corps_front_sectors` (already computed). For each friendly sector: finds enemy sectors sharing front edges via `edgeToSectorsMap`; applies `passive_buildup_per_turn` (in contact) or `confidence_decay_per_turn` (no contact); derives `strength_category` from enemy sector density, `posture_observed` from corps operation type + density, `offensive_signs` from `active_operation.type === 'sector_attack'` (gated by `CONFIDENCE_DEEP_INTEL` and `recon_range ≥ 2`), `visible_brigade_ids` from assigned/reserve brigade lists (gated by confidence thresholds). Writes to `state.sector_intel`.
  - `updateSectorIntelFromCombat(state, attackerOsid, defenderOsid, turn)` — recon-by-force. Finds the friendly/enemy sector pair via `sub_segments[].friendly_osids`, sets `confidence = 1.0`, recomputes all observable fields.
- **MODIFY `src/sim/turn_phases/war_phases.ts`:** Replaced `phase-ii-recon-intelligence` step with `derive-sector-intel` (positioned after `partition-corps-front-sectors`, before `generate-bot-corps-orders`). Removed `updateReconIntelligence` import.
- **MODIFY `src/sim/combat/attack_resolution_osid.ts`:** Added `updateSectorIntelFromCombat` call after brigade history recording block (every resolved engagement).
- **NEW `tests/sector_intel.test.ts`:** 17 tests (T1–T13): first-contact buildup, accumulation cap, decay, strength bins, visibility thresholds, recon-by-force, same-faction no-op, profile constants ordering.

### Phase 3 — Bot Integration

- **MODIFY `src/sim/combat/bot_corps_ai.ts`:** Before the `offensiveTargets.sort()`, builds two maps (`targetToFriendlySector` and `targetToEnemySector`) for O(1) per-OSID lookup, then scores each target: `thin → −2`, `fortress → +2`, `dense → +1`. Intel weight is secondary sort key (after supply criticality, before consolidation score). Requires `confidence ≥ CONFIDENCE_ROUGH_STRENGTH` to apply.

### Phase 4 — Legacy Removal

- **DELETE `src/sim/combat/recon_intelligence.ts`:** BFS-over-SID-graph system fully removed (171 lines). Zero bots ever read it; GUI was only consumer of `confirmed_empty`.
- **MODIFY `src/state/game_state.ts`:** Removed `ReconStrengthCategory`, `DetectedBrigadeInfo`, `ReconIntelligence` types and `recon_intelligence` field.
- **MODIFY `src/ui/warroom/data/war_data_extractor.ts`:** Removed Method 1 recon block (read `state.recon_intelligence`). Method 2 (casualty ledger) continues to populate `ContactedFormation[]` for the warroom display.

### Refactor Pass (commit `6385dc2`)

- `sector_intel.ts`: removed redundant `.slice()` before `.sort()` (all branches already return a new array); fixed import block spacing.
- `bot_corps_ai.ts`: replaced inner `sub_segments.some()` iteration with two flat maps built upfront; fixed broken indentation on supply-sort comment.

---

## Scenario Results

| Metric | Value |
|--------|-------|
| 40w area-weighted (pre-change) | 95.6% |
| 40w area-weighted (post-change) | 95.6% |
| Hash (latest run) | `a578bc5c9d687c57` |
| Vitest tests | 313 pass, 1 skipped |

Zero regression. Bot weighting is a soft sort modifier — targets that are already well-chosen by supply priority are not displaced.

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Sector-pair granularity (not OSID-level) | Defense in the sector world is pooled at sector level; OSID occupation is irrelevant to sector density. |
| Faction-level recon profiles (not unit-level) | ARBiH elite recon advantage baked into constants — same pattern as morale floors and mobilization rates. Avoids unit tag proliferation. |
| Recon-by-force via `updateSectorIntelFromCombat` | Every engagement reveals the enemy sector completely (confidence 1.0). Natural "blood intelligence" mechanic. |
| `visible_brigade_ids` populated but GUI deferred | Phase 5 GUI agent to update `buildFogOfWarGeoJSON`, `GameStateAdapter`, `types.ts`. State is ready; no blocking issue. |
| Probe deferred | `BrigadePosture` has no `'probe'` value. Probe action is future scope. |

---

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/sector_intel_constants.ts` | NEW — faction recon profiles + confidence thresholds |
| `src/sim/combat/sector_intel.ts` | NEW — deriveSectorIntel + updateSectorIntelFromCombat |
| `tests/sector_intel.test.ts` | NEW — 17 tests (T1–T13) |
| `src/state/game_state.ts` | MODIFY — new types + sector_intel field; legacy types removed |
| `src/state/serializeGameState.ts` | MODIFY — sector_intel added; recon_intelligence removed |
| `src/sim/turn_phases/war_phases.ts` | MODIFY — derive-sector-intel step replaces phase-ii-recon-intelligence |
| `src/sim/combat/attack_resolution_osid.ts` | MODIFY — recon-by-force hook after each engagement |
| `src/sim/combat/bot_corps_ai.ts` | MODIFY — intel-weighted target sort |
| `src/ui/warroom/data/war_data_extractor.ts` | MODIFY — Method 1 recon block removed |
| `src/sim/combat/recon_intelligence.ts` | DELETED |
| `vitest.config.ts` | MODIFY — sector_intel.test.ts added to include list |

---

## Next Steps

1. **GUI Phase 5 (deferred):** Update `src/ui/map/data/types.ts` (replace `ReconIntelligenceView` with `SectorIntelView`), `GameStateAdapter.ts` (extract `sector_intel`), `buildFogOfWarGeoJSON.ts` (use `visible_brigade_ids` set to show/hide enemy formation icons). State is already populated.
2. **Probe action:** Add `'probe'` posture to `BrigadePosture` + implement probe confidence gain with casualty cost in `sector_intel.ts`.
3. **Warroom display:** Update warroom intelligence panel to read `sector_intel` and display sector-level strength/posture summaries for player faction.
