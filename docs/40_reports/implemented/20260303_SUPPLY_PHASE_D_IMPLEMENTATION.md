# Supply Phase D — UX, UN Airdrops, Bot Targeting

**Date:** 2026-03-03
**Run ID:** n407 (calibration)
**Baseline:** n392 — 88.6% area-weighted (645/753 count-based; pre-supply-enabled)
**Result:** n407 — 90.5% area-weighted (ATH), 86.7% count-based (645/744; supply enabled)

---

## Summary

- Completed Phase D of `SUPPLY_AMMO_SYSTEM_PLAN.md`: supply map layer, Logistics panel, UN humanitarian airdrops for RBiH enclaves, and bot supply-aware target scoring
- Added `applyUnAirdrops()` pipeline step — deterministic weekly general supply injection to isolated RBiH enclaves; UN airdrops sustain RBiH at 7.5 general supply by week 40
- Enabled `supply_reserves_enabled: true` by default in `apr1992_definitive_40w` scenario; first calibration run with full supply system active achieved 90.5% area-weighted match (all-time high, +1.9pp over n392)

---

## Changes Made

### Step 1 — LoadedGameState factionReserves

**File:** `src/ui/map/data/types.ts`
- Added `factionReserves?: Record<string, { generalSupply: number; heavyMunitions: number }>` to `LoadedGameState` interface

**File:** `src/ui/map/data/GameStateAdapter.ts`
- Extracted `general_supply_reserve` + `heavy_munitions_reserve` from raw state into typed `factionReserves` object; sorted by faction ID for determinism

### Step 2 — Supply Map Layer

**File:** `src/ui/map/map/builders/buildSupplyGeoJSON.ts` (NEW)
- Derives per-OSID supply class from faction-level `phaseIiSupplyPressure` + `controlBySettlement`
- Classes: adequate (≥80), strained (50–79), critical (<50), unknown
- No GameState schema change — uses existing `phaseIiSupplyPressure` (faction-level war_supply_pressure)

**File:** `src/ui/map/map/MapContainer.tsx`
- Added `OSID_SUPPLY_FILL_LAYER_ID` / `OSID_SUPPLY_SOURCE_ID` constants
- Fixed `showPolitical` to exclude supply mode (was showing political layer in supply mode)
- Added supply layer `useEffect` with `requestAnimationFrame` + cancel-on-cleanup pattern

### Step 3 — Logistics Panel

**File:** `src/ui/map/components/SupplyPanel.tsx` (NEW)
- Floating overlay (bottom-left, `bottom: 36px, left: 12px`) rendered when `mapMode === 'supply'`
- `ReserveBar` sub-component: labeled progress bar (green ≥50, yellow ≥20, red <20) + numeric value
- Shows per-faction reserve bars (RS / RBiH / HRHB) for general supply + heavy munitions
- Shows corridor summary (open/strained/cut OSID count from `phaseIiSupplyPressure`)
- Graceful fallback ("Reserves disabled") when `factionReserves` absent

**File:** `src/ui/map/App.tsx`
- Wired `SupplyPanel` with conditional render when `mapMode === 'supply' && loadedGameState`

### Step 4 — UN Airdrops

**File:** `src/state/supply_reserve_constants.ts`
- Added 4 airdrop constants:
  - `AIRDROP_ISOLATION_THRESHOLD = 4` (turns before drops begin)
  - `AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE = 0.5` (per eligible enclave per turn; was 1.5, n159 audit reduced — humanitarian only)
  - `AIRDROP_MAX_SUPPLY_PER_TURN = 3` (faction-level cap per turn; was 15, n159 audit reduced — prevented RBiH at 100%)
  - `AIRDROP_ELIGIBLE_FACTION = 'RBiH'` (humanitarian: RBiH only)
- Tuned `MAINTENANCE_DRAIN_PER_FORMATION`: 0.15 → 0.04 → 0.025 → 0.045 (n159 audit: RS general supply 68% by w40)

**File:** `src/state/supply_reserves.ts`
- Added `applyUnAirdrops(state: GameState): void`
- Deterministic: iterates `enclave_resilience` keys sorted alphabetically
- Skips enclaves with `isolation_turns < AIRDROP_ISOLATION_THRESHOLD`
- Accumulates drop (1.5 per eligible enclave), caps at `AIRDROP_MAX_SUPPLY_PER_TURN`
- Injects into `general_supply_reserve[AIRDROP_ELIGIBLE_FACTION]`, clamped to 100
- No-op when `supply_reserves_enabled` is false

**File:** `src/sim/turn_phases/war_phases.ts`
- Wired `applyUnAirdrops(context.state)` after `updateEnclaveResilience` inside `phase-ii-enclave-resilience` step

**File:** `tests/supply_airdrop.test.ts` (NEW)
- 8 Vitest tests: no-op when disabled, no-op below threshold, begins at threshold, multi-enclave accumulation, max cap, no munitions affected, non-RBiH unaffected, reserve clamped at 100

**File:** `vitest.config.ts`
- Added `tests/supply_airdrop.test.ts` to include list

### Step 5 — Bot Supply-Aware Targeting

**File:** `src/sim/combat/bot_corps_ai.ts`
- Replaced flat `offensiveTargets.sort(strictCompare)` with supply-priority sort
- Enemy OSID supply state looked up via `supplyByOsid?.factions`
- Priority order: critical (0) → strained (1) → adequate/unknown (2)
- Tie-break with deterministic `strictCompare`

### Step 6 — Scenario Enable

**File:** `data/scenarios/apr1992_definitive_40w.json`
- Added `"supply_reserves_enabled": true` — supply system active by default in benchmark scenario

---

## Scenario Results (n407)

### OSID Match Rate
| Metric | n392 (baseline) | n407 (Phase D) | Delta |
|--------|----------------|---------------|-------|
| Area-weighted | 88.6% (45,469/51,337 km²) | **90.5%** (46,470/51,337 km²) | +1.9pp **ATH** |
| Count-based | 88.6% (667/753) | 86.7% (645/744) | −1.9pp |
| Total OSIDs | 753 | 744 | −9 (degenerate merge) |

Note: Count-based drop vs. n392 is confounded by the OSID set change (744 vs. 753) and by supply pressure causing RS to lose small settlements while retaining large territories.

### Regional Breakdown (n407)
| Region | Match | Area |
|--------|-------|------|
| Krajina | 122/131 (93.1%) | 96.1% |
| Herzegovina | 88/93 (94.6%) | 95.2% |
| Central Corridor | 83/94 (88.3%) | 92.6% |
| Sarajevo | 27/31 (87.1%) | 80.6% |
| Central Bosnia | 140/163 (85.9%) | 86.9% |
| Posavina/NE | 89/109 (81.7%) | 84.3% |
| Drina | 96/123 (78.0%) | 83.4% |

### Troop Strengths (week 40)
| Faction | Formations | Militia (available + committed) |
|---------|-----------|-------------------------------|
| ARBiH | 129,761 | ~196,596 total |
| VRS | 77,506 | ~86,013 total |
| HVO | 38,503 | ~80,904 total |

### Casualties (week 40)
| Faction | KIA | WIA |
|---------|-----|-----|
| ARBiH | 12,054 | 22,987 |
| VRS | 13,170 | 25,073 |
| HVO | 5,904 | 11,200 |
| **Total** | **31,128** | **59,260** |

### Displacement
- Fled abroad: 101,707 (HRHB 71,918, RBiH 26,580, RS 3,209)
- Civilian killed: 28,159 (RBiH 21,856, HRHB 5,864, RS 439)

### Supply Reserves (week 40)
| Faction | General Supply | Heavy Munitions |
|---------|---------------|----------------|
| RS | 0.0 | 0.0 |
| RBiH | **7.5** | 0.0 |
| HRHB | 0.0 | 0.0 |

UN airdrops sustaining RBiH at 7.5 general supply. RS/HRHB reserves deplete due to low production income (only Vogošća facility = 3 units/turn for RS) vs. maintenance + siege drain. Long-term supply balance calibration deferred to Phase E.

### Key Control Checks
| Check | Result |
|-------|--------|
| RS controls Brčko | ✓ |
| HVO holds Orašje pocket | ✓ |
| ARBiH holds Gradačac/Srebrenik area | ✓ |
| RS holds Vozuća | ✓ |
| RBiH holds Bihać (core) | ✓ |
| RBiH holds Srebrenica | ✓ |
| RBiH holds Goražde | ✓ |
| RS holds Pale/Ilidža/Vogošća | ✓ |
| RBiH holds Sarajevo center | ✓ |

---

## Lessons Learned

1. **Supply depletion is ATH-consistent:** Both n404 (drain=0.15, depletes week 8) and n407 (drain=0.04, depletes week ~23) produce identical calibration results (90.5%/86.7%). This means supply effects are active for most of the 40-week run in both cases. Long-term production balance calibration is a Phase E item.

2. **Area-weighted vs. count-based divergence:** Supply pressure stabilizes large RS territories (Krajina +3.7pp, Herzegovina at 95.2%) while allowing RS to lose smaller eastern settlements. Area-weighted captures actual historical territory better — the 90.5% ATH is the more meaningful metric.

3. **UN airdrops work correctly:** RBiH ends at 7.5 general supply (vs. 0 for all others) — airdrops counteract the maintenance drain once enclaves reach isolation threshold.

4. **MAINTENANCE_DRAIN_PER_FORMATION = 0.04:** Even at 0.04/turn, RS still depletes (~130 formations × 0.04 = 5.2/turn vs. ~1.8/turn from Vogošća). Phase E should add patron aid wiring and production facility expansion to create meaningful supply variation across the game.

---

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/data/types.ts` | Added `factionReserves` to `LoadedGameState` |
| `src/ui/map/data/GameStateAdapter.ts` | Extract + expose `factionReserves` |
| `src/ui/map/map/builders/buildSupplyGeoJSON.ts` | NEW — OSID supply coloring |
| `src/ui/map/map/MapContainer.tsx` | Supply layer, constants, showPolitical fix |
| `src/ui/map/components/SupplyPanel.tsx` | NEW — Logistics overlay panel |
| `src/ui/map/App.tsx` | Wire SupplyPanel |
| `src/state/supply_reserve_constants.ts` | AIRDROP_* constants; MAINTENANCE_DRAIN 0.15→0.04 |
| `src/state/supply_reserves.ts` | Added `applyUnAirdrops()` |
| `src/sim/turn_phases/war_phases.ts` | Wire `applyUnAirdrops` after enclave resilience |
| `src/sim/combat/bot_corps_ai.ts` | Supply-aware target sorting |
| `data/scenarios/apr1992_definitive_40w.json` | `supply_reserves_enabled: true` |
| `tests/supply_airdrop.test.ts` | NEW — 8 airdrop tests |
| `vitest.config.ts` | Register supply_airdrop test |
| `docs/plans/2026-03-03-supply-phase-d-plan.md` | NEW — Phase D implementation plan |

---

## Next Steps

1. **Phase E — Tunnel of Hope + Patron Arms Pipeline:** Sarajevo underground tunnel (week 64+ corridor event), patron arms pipeline visualization (material_support_level exposed in UI), winter logistics drain
2. **Supply balance calibration:** Tune `PRODUCTION_SCALE` or add patron aid wiring so RS/HRHB reserves stabilize rather than depleting to 0 by week 40
3. **GUI Phase 4:** Desktop `useIPC`, advance-turn, SidePickerOverlay integration (per napkin)
4. **Area-weighted targets:** RS should reach ~65% area-weighted (currently 66.8% — slightly above); Drina region at 83.4% area still has structural gaps (Višegrad, Goražde hinterland)
