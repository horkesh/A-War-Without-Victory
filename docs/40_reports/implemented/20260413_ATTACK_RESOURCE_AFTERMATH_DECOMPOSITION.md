# Tranche 6: Resource Aftermath Decomposition

**Date:** 2026-04-13
**Type:** God-file decomposition (v0.8-to-v0.9)
**Program:** Pure decomposition only — no behavior drift, no opportunistic fixes

## Seam chosen

Three fire-and-forget aftermath side-effect blocks in `attack_resolution_osid.ts`:
1. Supply reserve expenditure (Part 6b)
2. Facility combat damage (Part 6c)
3. Combat fatigue (ops.fatigue accumulation)

### Why this was the highest-value bounded seam

These are the last non-orchestration resource/ops-tempo side effects remaining inline. Each is self-contained with zero control-flow coupling — no return value, no downstream consumer of their mutations within the per-battle loop. Grouping them is honest: all three are "aftermath resource writes" gated by simple conditions. After this extraction, the resolver contains only orchestration logic (defense setup, power computation, outcome classification, casualty distribution calls, flip/retreat/displacement, history recording, and calls to extracted modules).

## Classification Table

| Family | Status | Target File |
|--------|--------|-------------|
| `FATIGUE_ATTACKER` (2), `FATIGUE_DEFENDER` (1) constants | **Moved** | `attack_resource_aftermath.ts` |
| Supply reserve expenditure (Part 6b) | **Moved** | `attack_resource_aftermath.ts` |
| Facility combat damage (Part 6c) | **Moved** | `attack_resource_aftermath.ts` |
| Combat fatigue (ops.fatigue) | **Moved** | `attack_resource_aftermath.ts` |
| Formation fatigue recording (`recordFormationFatigue`) | Still inline | `attack_resolution_osid.ts` (lines 628, 654 — different system) |
| Sector defense model | Still inline | `attack_resolution_osid.ts` |
| Per-formation combat effects loop | Still inline | `attack_resolution_osid.ts` |
| Flip execution + retreat/displacement | Still inline | `attack_resolution_osid.ts` |
| Brigade history recording | Still inline | `attack_resolution_osid.ts` |
| Operation feedback counters | Still inline | `attack_resolution_osid.ts` |
| AAR narrative queue | Still inline | `attack_resolution_osid.ts` |

## Files Changed

| File | Action | Lines before | Lines after | Delta |
|------|--------|-------------|-------------|-------|
| `src/sim/combat/attack_resource_aftermath.ts` | **Created** | — | 95 | +95 |
| `src/sim/combat/attack_resolution_osid.ts` | Edited | 1045 | 1027 | -18 |
| `tests/attack_resource_aftermath.test.ts` | **Created** | — | 335 | +335 |

**Cumulative from HEAD (1809 lines):** 1027 lines reported remaining (-782 lines, -43.2%). Note: HEAD measured at 1809 via PowerShell `Get-Content | Measure-Object -Line`; intermediate resolver size (1027) was reported during extraction, not independently remeasured. Post-T7 resolver is 907 lines (measured).

## Extracted Surface

### `attack_resource_aftermath.ts` (95 lines)

- **`FATIGUE_ATTACKER`** (constant, 2) — fatigue per battle per attacking formation
- **`FATIGUE_DEFENDER`** (constant, 1) — fatigue per battle for defending formation
- **`deductCombatSupplyExpenditure()`** — wraps Part 6b. Guards on `supply_reserves_enabled` + both reserve objects. Attacker pays full rate, defender half rate.
- **`applyFacilityCombatDamage()`** — wraps Part 6c. Guards on `supply_reserves_enabled` + `production_facilities`. Deterministic sorted iteration over facility IDs. Reduces condition by `FACILITY_COMBAT_DAMAGE_RATE` for matching municipality.
- **`applyCombatFatigue()`** — wraps COMBAT FATIGUE block. Initializes `ops` if missing. Caps at `FATIGUE_MAX`.

### Imports removed from `attack_resolution_osid.ts`

- `deductCombatExpenditure` from `../../state/supply_reserves.js` — only used in supply block
- `FACILITY_COMBAT_DAMAGE_RATE` from `../../state/supply_reserve_constants.js` — only used in facility block
- `FATIGUE_MAX` from `../../state/formation_constants.js` — only used in fatigue block
- **Retained:** `recordFormationFatigue` — still used at lines 628, 654 (different fatigue system)

## Call Site Positions

Each replacement call is at exactly the same position in the per-battle loop as the original inline block:

| Function | Call line | Position in loop |
|----------|----------|-----------------|
| `deductCombatSupplyExpenditure()` | 763 | After ammo crisis/pyrrhic, before experience gain |
| `applyFacilityCombatDamage()` | 772 | After supply expenditure, before experience gain |
| `applyCombatFatigue()` | 983 | After brigade history recording, end of loop |

## Verification Commands Actually Run

| Command | Result |
|---------|--------|
| `npx.cmd tsc --noEmit -p tsconfig.json` | Clean, no errors |
| `npx.cmd vitest run tests/attack_resource_aftermath.test.ts` | 17/17 passed |
| `npx.cmd vitest run tests/attack_morale_absorption.test.ts tests/attack_post_battle_effects.test.ts tests/attack_casualty_distribution.test.ts tests/attack_equipment_effects.test.ts tests/probe_territory_flip.test.ts tests/emergency_retreat_reachability.test.ts` | 161/161 passed |
| `npm.cmd run test:vitest` | 3478 tests passed, 295 suites, 0 failures |
| `npm.cmd run desktop:map:build` | Built successfully |

## Test Coverage (17 tests)

**`deductCombatSupplyExpenditure` (6 tests):**
1. Skips when `supply_reserves_enabled` is false
2. Skips when `general_supply_reserve` is missing
3. Skips when `heavy_munitions_reserve` is missing
4. Deducts for attacker when enabled
5. Deducts for both attacker and defender when defender present
6. No defender deduction when defender is null

**`applyFacilityCombatDamage` (6 tests):**
1. Skips when `supply_reserves_enabled` is false
2. Skips when `production_facilities` is missing
3. Reduces condition of matching municipality facility
4. Does not affect facilities in other municipalities
5. Clamps condition to 0 (never negative)
6. Deterministic sort order on facility IDs

**`applyCombatFatigue` (5 tests):**
1. Applies FATIGUE_ATTACKER (2) to all attackers
2. Applies FATIGUE_DEFENDER (1) to defender
3. Initializes ops if missing
4. Caps at FATIGUE_MAX
5. No-ops when no defender

## Seam Purity Statement

This tranche remained **pure decomposition**. Each function is a character-level copy of the original inline block with only the necessary function wrapper and parameter passing added. No arithmetic, guards, ordering, or behavior changed. No control-flow boundary was hit — all three blocks are fire-and-forget side effects with no return value or downstream coupling.

## Zero-Drift Proof

Not claimed — 40w scenario was not rerun in this session. Zero-drift is strongly indicated by: identical arithmetic (character-level copy), clean tsc, 3478/3478 vitest including all existing integration and regression tests, but not formally proven via scenario hash comparison.

## Recommended Next Tranche

The resolver was reported at 1027 lines after this tranche. Tranche 7 (brigade history recording) was subsequently completed; the resolver now measures **907 lines** (from HEAD 1809, -902 lines, -49.9%). The remaining inline logic is core orchestration — sector defense model, per-formation combat effects loop, flip/retreat/displacement, operation feedback, AAR queue. All remaining families are tightly coupled to the per-battle loop's local variables. Further extraction would require artificial "context" objects — fake abstraction, not decomposition. The decomposition program is **canonically closed**.
