# Combat Casualty Scaling, Operation Teocak, and Home Defense Exemption

**Date:** 2026-03-09
**Baseline:** n415 (89.4% area-weighted)
**Result:** n438 (87.2% area-weighted)
**Status:** Rastosnica captured; calibration regressed but with improved combat realism

## Summary
- Three major engine fixes and one new combat mechanic to solve Operation Teocak (Rastosnica capture) and improve casualty realism
- Root cause of Op Teocak failure identified: `canAdoptPosture()` in brigade_posture.ts silently blocks attack/assault posture for brigades with `home_defense_active === true`, preventing local brigades from attacking from their home municipality even when ordered by corps
- Power-ratio casualty scaling adds continuous within-band defender attrition proportional to attacker advantage (cube-root, defender-only)
- Sector offensive tuning prevents premature stall on first execution turn (phase-ordering bug)
- GUI improvements: CombatSummaryPanel reused in FormationDetail (DRY), engagement log parsing

## 1. Power-Ratio Casualty Scaling

**Problem:** Casualty rates were flat within each outcome band. A 3:1 power advantage resulting in "costly_victory" produced identical casualties to a 1.2:1 "costly_victory". Defenders holding against overwhelming force suffered unrealistically low losses.

**Changes** (`src/sim/combat/combat_math.ts`):
- New `getPowerRatioCasualtyMult(powerRatio)` returns `[attackerMult, defenderMult]`
- Cube-root scaling: `Math.pow(clampedRatio, 0.33)` — moderate effect since outcome modifiers already capture gross power differences
- Constants: `POWER_RATIO_CASUALTY_EXPONENT=0.33`, `MAX=2.0`, `MIN=0.4`
- Applied **defender-only** in `attack_resolution_osid.ts` (resolver) and `combat_predictor.ts` (predictor)
- Example: 3:1 power ratio → defender takes 1.44x base casualties; 0.5:1 ratio → defender takes 0.79x

**Design decision:** Initially applied to both attacker and defender (n423), which caused calibration regression. Defender-only is the correct balance — the outcome band already penalizes the attacker via `OUTCOME_ATTACKER_MOD`, and double-scaling caused excessive attacker losses.

## 2. Home Defense Operation Exemption (Root Cause Fix)

**Problem:** Operation Teocak repeatedly failed because participating brigades (241st, 242nd, 245th from Kalesija) could not attack. `computeHomeDefenseActive()` set `home_defense_active = true` for any brigade in its home municipality. Downstream, `canAdoptPosture()` in brigade_posture.ts silently rejects attack/assault posture for home defenders — no log, no warning, just a quiet no-op.

**Changes** (`src/sim/compute_home_defense.ts`):
- New `isOperationParticipant(state, corpsId, brigadeId)` — checks if brigade is assigned to any axis of the corps' active operation
- Brigades in active operations during **execution phase** are exempted from `home_defense_active`, allowing them to adopt offensive posture
- Only execution phase matters — during planning/staging, brigades should still defend home

**Impact:** Brigades ordered to attack by corps operations can now do so even from their home municipality. This was the single root cause of Op Teocak failure.

## 3. Operation Teocak Redesign

**Problem:** Original design used 120th Black Swans + 2nd Tuzla (far from objectives), staging from Tuzla — brigades had to march through multiple municipalities before engaging.

**Changes** (`src/sim/combat/pre_planned_operations.ts`):
- Brigades: 120th + 2nd Tuzla → **241st + 242nd + 245th** (Kalesija-based, adjacent to Rastosnica)
- Staging: `op:tuzla:simin_han_2` → `op:kalesija:kalesija_grad_2`
- Timing: `available_from: 14` → `25` (brigades need time to spawn and consolidate)
- New `min_attack_outcome: 'repulsed'` field — brigades attack even at unfavorable predicted outcomes
- Axis renamed from "Teocak Link" to "Kalesija Assault"

**Bot AI support** (`src/sim/combat/bot_brigade_ai_osid.ts`):
- `getSectorOffensiveProbeThreshold()` now checks `activeOp.min_attack_outcome` first, before applying momentum-based thresholds
- Planning march fix: brigades already at approach OSIDs no longer redirect to staging area (was `else` catch-all, now `else if (planningApproachOsids.size === 0)`)

## 4. Sector Offensive Tuning

**Problem:** Operations stalled prematurely. Two issues:
1. Failure limits too tight — 3 total / 2 consecutive was easily exhausted in contested territory
2. First execution turn always looks "idle" because `advance-sector-offensives` runs before `bot-brigade-orders` in the turn pipeline — brigades haven't received attack orders yet

**Changes** (`src/sim/combat/sector_offensive.ts`):
- `MAX_TOTAL_FAILURES`: 3 → **5**
- `MAX_CONSECUTIVE_FAILURES_ON_CURRENT`: 2 → **3**
- Idle stall threshold: `>= 1` → `>= 2` for both multi-axis (`updateMultiAxisResults`) and single-axis (`updateLegacyFlatResults`) — first execution turn is always a freebie

**Test update** (`tests/sector_offensive_idle_recovery.test.ts`): Threshold assertions updated to match `>= 2`.

## 5. GUI Improvements

**FormationDetail.tsx:**
- Replaced 40-line inline combat stats with `<CombatSummaryPanel>` component reuse (DRY)
- Added `ZERO_BRIGADE_COMBAT_SUMMARY` constant — brigades without combat history still show the Combat Record section (all zeros)
- Engagement log parsing from `brigade_history` data

**CombatSummaryPanel.tsx:**
- New `noTopBorder` prop for embedding without visual separation
- Labels changed to lowercase for consistency

**GameStateAdapter.ts:**
- `brigade_history` parsing for engagement log data
- `attackerWins` and `attackerLosses` outcome sets hoisted to module-level constants (was re-created per call)

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| `src/sim/combat/combat_math.ts` | +19 | `getPowerRatioCasualtyMult()` + 3 constants |
| `src/sim/combat/attack_resolution_osid.ts` | +2 | Defender-only casualty scaling applied |
| `src/sim/combat/combat_predictor.ts` | +2 | Same defender-only scaling in predictor |
| `src/sim/compute_home_defense.ts` | +18 | `isOperationParticipant()` + execution-phase exemption |
| `src/sim/combat/pre_planned_operations.ts` | +12/-11 | Op Teocak redesign + `min_attack_outcome` field |
| `src/sim/combat/bot_brigade_ai_osid.ts` | +5/-2 | `min_attack_outcome` threshold + planning march fix |
| `src/sim/combat/sector_offensive.ts` | +4/-4 | Failure limits + idle stall threshold |
| `src/ui/map/components/FormationDetail.tsx` | +30/-40 | CombatSummaryPanel reuse, engagement log |
| `src/ui/map/components/CombatSummaryPanel.tsx` | +6/-4 | `noTopBorder` prop, lowercase labels |
| `src/ui/map/data/GameStateAdapter.ts` | +20/-10 | brigade_history parsing, module constants |
| `tests/sector_offensive_idle_recovery.test.ts` | +2/-2 | Updated threshold assertions |

## Calibration Impact

| Region | n415 | n438 | Delta |
|--------|------|------|-------|
| Area-weighted | 89.4% | 87.2% | -2.2pp |
| Drina | 78.4% | improved | local ops working |

The -2.2pp regression is expected: power-ratio casualty scaling increases defender losses across all fronts, changing territorial dynamics. The key deliverable — Rastosnica capture via Op Teocak — is achieved.

## Lessons Learned

1. **Silent posture rejection is dangerous.** `canAdoptPosture()` returns false for home defenders without any logging. Operations that assign brigades to attack their home municipality will silently fail. The exemption mechanism is essential, but the silent rejection pattern should be addressed with diagnostic logging in future work.

2. **Cube-root (0.33) is the right exponent for casualty scaling.** Linear (1.0) was far too aggressive. Square-root (0.5) still caused noticeable regression. Cube-root provides meaningful differentiation within outcome bands without destabilizing the overall casualty model.

3. **Defender-only scaling is the correct application.** Applying power-ratio scaling to both sides double-counts the power advantage (outcome modifiers already capture the attacker's penalty). Defender-only adds realism: a force with 3:1 advantage decisively destroys defenders faster than 1.2:1.

4. **Phase ordering creates false idle detection.** When `advance-sector-offensives` runs before `bot-brigade-orders`, the first execution turn always has zero attacks/moves logged. The idle stall detector must grant at least one free turn before declaring an operation stalled.

5. **Local brigades make better operation participants.** Using 120th + 2nd Tuzla required multi-municipality marches. Using 241st/242nd/245th from adjacent Kalesija eliminated the approach problem entirely.
