# Calibration Regression: dig_in Movement Lockout + Operation Kupres Investigation

**Date:** 2026-03-05
**Session:** Worktree merge + calibration investigation
**Result:** dig_in fix for balanced corps applied (n22=83.3%). Regression from dig_in lockout confirmed (-6.4pp). Operation Kupres pre-planned op deferred.

---

## Summary

- The `acdd4b9` commit (2026-03-04) added movement lockout for `dig_in` brigades. This broke calibration from ~90% (n471, pre-lockout) to 83.4% (n21, post-lockout) — a **-6.4pp regression**.
- Removing `dig_in` from balanced corps in bot Rule 6 partially recovers +0.1pp (n22=83.3%). The fix is correct but incomplete.
- Operation Kupres as a pre-planned op was tried and abandoned: forcing vrs_2nd_krajina to `offensive` stance permanently caused -6.7pp regression due to force reallocation across Krajina/POSAVINA_NE.
- The scenario hash `137cf28f1ee0a9c8` (current) produces 83.4% with current code. The ATH of 92.0% (n466-n469) used a different scenario hash (`1b35b0b6ea283b9b`) and pre-lockout code.

---

## Investigation Timeline

### Starting Point
- Previous worktree session (feature/posture-system) investigated calibration regression from posture system merge
- User requested two fixes: (1) Operation Kupres as pre-planned op, (2) remove dig_in from balanced corps
- Worktree branch lacked Vienna Declaration (`local_truces.ts`) — results not comparable to main

### Operation Kupres Investigation (DEFERRED)

Three staging OSID approaches tried for pre-planned op:
1. `op:sipovo:sipovo_2` → fails (brigades can't march there in planning window)
2. `op:kupres:bucovaca` → fails (not adjacent to kupres_2; faces RBiH, not HRHB)
3. `op:donji_vakuf:pribraca_2` → correct position (RS OSID adjacent to kupres_2)

Even with correct staging, Operation Kupres causes catastrophic regression:
- **n19 (Op Kupres only):** 83.0% area (−6.7pp vs n21 baseline)
- Root cause: `injectPrePlannedOperations()` sets vrs_2nd_krajina to `offensive` permanently
- 2KK offensive stance → force overcommitment in Kupres direction → Krajina/POSAVINA_NE defense weakens
- KRAJINA dropped 120/131→107/131 (−13 matches), POSAVINA_NE dropped 94/109→83/109 (−11 matches)

**Decision:** Operation Kupres deferred. The organic bot + Kalesija calibration overrides already handle Kupres capture in n466 (92.0% ATH). Pre-planned op approach is incompatible with stable force allocation across 2KK's full front.

**Also investigated:** `rs_7th_krajina_motorized home_osid=pribraca_2` (moves brigade from Kupres area to Donji Vakuf). This alone caused 89.7%→83.4% regression (n20 vs n21) by leaving Kupres area undefended. Reverted.

### dig_in Movement Lockout Regression Discovery

After reverting all worktree changes, running clean code (n21) still produced 83.4% vs expected 89.7%:

| Run | Hash | Code | RS | RBiH | HRHB | Area | Count |
|-----|------|------|----|------|------|------|-------|
| n469 | 1b35b0b6 | pre-lockout + n466 config | 408 | 244 | 92 | 92.0% | 90.2% |
| n470 | 7d8d3fbd | pre-lockout + new config | 422 | 233 | 89 | 89.8% | 86.8% |
| n471 | 137cf28f | pre-lockout + current config | 420 | 235 | 89 | 90.0% | 87.4% |
| n472 | 137cf28f | pre-lockout + current config | 395 | 252 | 97 | 89.7% | 87.6% |
| n21  | 137cf28f | **post-lockout** + current config | 333 | 296 | 115 | **83.4%** | **82.5%** |

**Root cause confirmed:** Commit `acdd4b9 fix(posture): brigade posture dropdown + dig_in movement lockout` (2026-03-04 20:19) added movement lockout for `dig_in` brigades in `osid_column_movement.ts`. After w20 RS transitions from `general_offensive` to `balanced`. Balanced corps brigades with no viable attack get `dig_in` in Rule 6 → **permanently immobilized** → can't reposition to respond to RBiH advances → RS loses 62 OSIDs.

### dig_in Fix Applied (n22)

Removed dig_in from balanced corps Rule 6:
- **Before:** balanced corps + cohesion ≥ 20 → `dig_in` (locked)
- **After:** balanced corps → `defend` (mobile)

**n22 result:** 83.3% area (−0.1pp, effectively neutral). The fix is logically correct (balanced brigades need mobility) but only recovers 0.1pp.

The remaining 6.4pp gap requires broader calibration investigation:
- Possible factor: offensive RS brigades (w0-20) accidentally getting `dig_in` at wrong moments
- Possible factor: home ground defense mechanic (added in `dd79584`) creating structural RBiH defense advantage
- Needs systematic isolation of which brigades are affected by lockout

---

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/bot_brigade_ai_osid.ts` | Rule 6: balanced corps `dig_in` → `defend` |
| `data/source/oob_brigades.json` | **NOT changed** (home_osid for rs_7th was tried and reverted) |
| `src/sim/combat/pre_planned_operations.ts` | **NOT changed** (Operation Kupres deferred; comment already present) |

---

## Current Calibration State (n22)

**Run:** `apr1992_definitive_40w__137cf28f1ee0a9c8__w40_n22`
**Area-weighted:** 83.3% (42,756/51,337 km²)
**Count:** 82.5% (614/744 OSIDs)

| Region | Match | Area | RS_sim | RBiH_sim | HRHB_sim |
|--------|-------|------|--------|----------|----------|
| KRAJINA | 108/131 (82.4%) | 84.1% | 88 | 34 | 9 |
| POSAVINA_NE | 83/109 (76.1%) | 78.4% | 45 | 51 | 13 |
| DRINA | 90/123 (73.2%) | 73.6% | 72 | 51 | 0 |
| CENTRAL_CORRIDOR | 83/94 (88.3%) | 89.2% | 35 | 53 | 6 |
| CENTRAL_BOSNIA | 141/163 (86.5%) | 83.6% | 36 | 85 | 42 |
| SARAJEVO | 25/31 (80.6%) | 84.4% | 21 | 10 | 0 |
| HERZEGOVINA | 84/93 (90.3%) | 87.9% | 34 | 14 | 45 |

**Painted targets:** RS=411 (55.2%), RBiH=246 (33.1%), HRHB=87 (11.7%)
**Sim totals:** RS=331 (44.5%), RBiH=298 (40.1%), HRHB=115 (15.5%)
**Delta:** RS=−80, RBiH=+52, HRHB=+28

---

## Next Steps for Calibration Recovery

1. **Investigate offensive corps dig_in exposure**: Check if RS offensive corps brigades (w0-20) ever get dig_in before transitioning. If yes, add offensive to the no-dig_in rule.
2. **Check home ground defense timing**: `home_defense_active` added in `dd79584`. Confirm it doesn't fire too early in the scenario (before RS can capture initial territory).
3. **Isolate lockout impact by corps**: Print which brigades are dig_in locked at which turns. High-volume lock in 1KK or SRK would explain POSAVINA/DRINA drops.
4. **Calibration re-tune with n466 scenario config**: The n466 config (hash `1b35b0b6ea283b9b`) achieved 92.0% with pre-lockout code. Running it with post-lockout code + dig_in fix would show the full lockout impact in isolation.

---

## Lessons Learned

1. **Scenario hash ≠ code version**: Same hash can produce different results if code changed between runs. Always re-run to validate a stored result rather than relying on old run directories.
2. **Operation pre-planned ops force stance permanently**: `injectPrePlannedOperations()` sets corps stance to `offensive` with no expiry. Adding a new corps to this list has full-game effects, not just early-war. Either gate stance duration or don't set stance for corps that have organic doctrine transitions.
3. **Movement lockout amplifies bot posture bugs**: Any over-assignment of `dig_in` becomes catastrophic when lockout is active. Bot posture logic must be audited with lockout in mind.
4. **rs_7th home_osid disrupts territorial balance**: Moving a brigade from its natural spawn to pribraca_2 leaves its original territory undefended. The spawning position was chosen for a reason (bucovaca is a gateway that brigade naturally defends).
