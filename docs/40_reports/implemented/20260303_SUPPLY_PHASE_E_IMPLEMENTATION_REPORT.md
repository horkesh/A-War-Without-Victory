# Supply Phase E — Income Balance + Heavy Munitions Differentiation

**Date:** 2026-03-03
**Run IDs:** n408 (E1), n409 (E2)
**Baseline:** n407 (90.5% ATH)
**Result:** n409 (90.5% ATH maintained)

## Summary

Phase E implements two supply subsystem improvements: income balance corrections (E1) and heavy munitions bombardment differentiation (E2). E1 rescales patron aid and adds a JNA inheritance bonus for RS representing captured April 1992 ammunition warehouses. E2 gates bombardment casualty multipliers and artillery suppression on faction heavy munitions reserve levels, creating a meaningful mechanical distinction between munitions-rich and munitions-poor factions.

Both phases maintain the all-time-high calibration at **90.5% area-weighted match** (n408 = n409). E2 is mechanically inert at 40 weeks due to RS heavy munitions remaining at 100 throughout the run; differentiation will manifest in longer runs or after a drain rate review.

## Changes Made

### Phase E1 — Supply Income Balance

**`src/state/supply_reserve_constants.ts`**
- `PATRON_AID_SCALE` changed from `1.0` to `12`. This rescales the per-faction patron aid income to a level that produces historically plausible reserve trajectories.
- Two new constants added:
  - `JNA_INHERITANCE_FACTION = 'RS'` — the faction receiving the one-time inheritance bonus.
  - `JNA_INHERITANCE_HEAVY_BONUS = 40` — heavy munitions added to RS at scenario start, representing JNA ammunition warehouses captured in April 1992.

**`src/state/supply_reserves.ts`**
- New function `applyJnaInheritanceBonus(state)` — adds 40 heavy munitions to RS at scenario start, capped at 100. No-op when `supply_reserves_enabled = false`. This is a one-time init call, not a recurring income source.

**`src/scenario/scenario_runner.ts`**
- `applyJnaInheritanceBonus(state)` is called after `ensureSupplyReserves(state)` during scenario initialization, conditioned on `supply_reserves_enabled`.

**`tests/supply_phase_e1.test.ts`** (NEW)
- 7 Vitest tests covering: JNA bonus application, cap at 100, no-op when disabled, PATRON_AID_SCALE constant value, constants presence.

### Phase E2 — Heavy Munitions Differentiation

**`src/sim/combat/combat_math.ts`**
- New private helper `getHeavyMunitionsMult(factionId, state)` — returns a multiplier based on the attacking faction's `heavy_munitions_reserve`:
  - `>= 50` (adequate): `1.0`
  - `20–49` (strained): `0.75`
  - `< 20` (critical): `0.5`
  - Returns `1.0` when `supply_reserves_enabled = false` (zero behavioral change when disabled).
- `getBombardmentCasualtyMult()` signature updated to `(attackers, attackerFactionId, state)`. The bonus portion of the multiplier (above 1.0) is scaled by `munitionsMult`. Base of 1.0 is preserved regardless of reserve level.
- `getArtillerySuppression()` signature updated to `(attackers, attackerFactionId, state)`. Output is scaled by `munitionsMult`. A faction that runs out of heavy munitions retains no suppression advantage.

**`src/sim/combat/attack_resolution_osid.ts`**
- 2 caller sites updated to pass `attackerFactionId` and `state` to the updated bombardment/suppression functions.

**`src/sim/combat/combat_predictor.ts`**
- 2 caller sites updated to pass `attackerFactionId` and `state` to the updated bombardment/suppression functions.

**`tests/supply_phase_e2_bombardment.test.ts`** (NEW)
- 8 Vitest tests covering: adequate/strained/critical multiplier tiers, disabled-system no-op, caller integration with bombardment and suppression.

**`vitest.config.ts`**
- 2 new `include` entries for the new test files.

## Calibration Results

### n408 — After Phase E1

| Metric | Value |
|--------|-------|
| Area-weighted match | **90.5%** (ATH maintained) |
| RS OSIDs | 426 |
| RBiH OSIDs | 230 |
| HRHB OSIDs | 88 |
| Total OSIDs scored | 744 |
| Total KIA | 31,128 |
| ARBiH KIA | 12,054 |
| VRS KIA | 13,170 |
| HVO KIA | 5,904 |
| RS `general_supply` at w40 | 0 (critical) |
| RS `heavy_munitions` at w40 | 100 (sustained) |

### n409 — After Phase E2

| Metric | Value |
|--------|-------|
| Area-weighted match | **90.5%** (ATH maintained — identical to n408) |
| Total KIA | 31,128 (identical — E2 inert, see Key Findings) |

## Key Findings

**Siege drain root cause.** RS `general_supply` depletes to 0 by w40 because 8 RS critical OSIDs accumulate 40-turn siege counters, creating ~7.4 units/turn drain at w40. Patron income at `PATRON_AID_SCALE = 12` produces ~4.7 units/turn — insufficient to offset drain. Reaching the strained range (20–50) would require `PATRON_AID_SCALE ≈ 25`, well above the value estimated during planning. The current behavior is mechanically coherent but the RS general supply dynamic warrants a design decision: should RS pay siege drain for its own isolated OSIDs, or should siege drain apply only to besieged factions (RBiH/HRHB)? Deferred to siege drain design review.

**E2 inert at 40 weeks.** RS `heavy_munitions` remains at 100 throughout the 40-week run because `COMBAT_HEAVY_MUNITIONS_RATE = 0.02/battle` is too low to deplete from a JNA starting position of 100 within 40 weeks of combat. The mechanism is correctly wired and tested. Differentiation will emerge in longer runs (56w, 104w) or after a drain rate review. No calibration regression from E2 wiring.

**Historical plausibility of RS supply split.** The dynamic of RS being heavy-munitions-rich but general-supply-poor is historically plausible: VRS relied on JNA artillery stocks inherited from the April 1992 takeover, while UN sanctions degraded logistics, fuel, and food resupply throughout the war. The two-reserve model captures this split correctly in structure even if the 40-week run does not yet stress it.

**ATH stability.** Both n408 and n409 hold at 90.5%. The supply changes alter RS trajectory slightly (426 vs 420 OSIDs in n392 baseline) without degrading regional accuracy. The income rebalance does not perturb territorial mechanics because `supply_reserves_enabled` gating means operational decisions remain unchanged until reserves drop below `RESERVE_ADEQUATE_THRESHOLD = 50`.

## Files Changed

| File | Change |
|------|--------|
| `src/state/supply_reserve_constants.ts` | `PATRON_AID_SCALE` 1.0 → 12; `JNA_INHERITANCE_FACTION`, `JNA_INHERITANCE_HEAVY_BONUS` constants added |
| `src/state/supply_reserves.ts` | `applyJnaInheritanceBonus()` function added |
| `src/scenario/scenario_runner.ts` | Wire `applyJnaInheritanceBonus()` at scenario initialization |
| `src/sim/combat/combat_math.ts` | `getHeavyMunitionsMult()` added; `getBombardmentCasualtyMult()` and `getArtillerySuppression()` signatures updated |
| `src/sim/combat/attack_resolution_osid.ts` | 2 caller sites updated for new bombardment/suppression signatures |
| `src/sim/combat/combat_predictor.ts` | 2 caller sites updated for new bombardment/suppression signatures |
| `tests/supply_phase_e1.test.ts` | NEW — 7 tests |
| `tests/supply_phase_e2_bombardment.test.ts` | NEW — 8 tests |
| `vitest.config.ts` | 2 new include entries |

## Next Steps

1. **Siege drain design review** — Decide whether RS should pay siege drain for its own isolated OSIDs or whether drain applies only to besieged factions (RBiH/HRHB). If RS is excluded from drain on its own territory, `PATRON_AID_SCALE = 12` should be sufficient to maintain RS in strained range at 40w.
2. **`COMBAT_HEAVY_MUNITIONS_RATE` review** — If E2 differentiation is desired within 40-week runs, increase drain rate or reduce JNA bonus so RS heavy munitions drops into strained/critical range by ~w30.
3. **Phase E3** — Crisis Event Windows and Patron Call-In mechanics (deferred from original plan). Intended to model UN arms embargo incidents and patron escalation events as discrete supply shocks rather than continuous flows.
