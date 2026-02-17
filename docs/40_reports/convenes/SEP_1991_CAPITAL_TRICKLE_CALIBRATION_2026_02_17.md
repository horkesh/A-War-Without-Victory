# Sep 1991 Phase 0 Capital Trickle Calibration

**Date:** 2026-02-17  
**Scope:** Scenario-gated prewar capital trickle constants for Sep 1991 Phase 0 runs.

## Runs

| Weeks | Phase at end | RBiH | RS | HRHB | Delta each |
|-------|--------------|------|-----|------|------------|
| 20    | phase_0      | 70→90 | 100→120 | 40→60 | +20 |
| 31    | phase_i      | 70→90 | 100→120 | 40→60 | +20 |

Initial: RBiH 70, RS 100, HRHB 40 (canon defaults).  
Final: all factions gain +20 from trickle; cap reached by turn 20.

## Constants

- `PREWAR_CAPITAL_TRICKLE_PER_TURN = 1`
- `PREWAR_CAPITAL_TRICKLE_MAX_BONUS = 20`
- Gating: `phase_0` + scheduled referendum/war-start meta

## Findings

1. **Cap behavior:** Trickle adds 1 per turn; cap at initial + 20. By turn 20, all factions hit cap.
2. **Sep 1991 schedule:** War start turn 30; 31w run transitions to phase_i at turn 31.
3. **No spending:** Harness runs have no investments; capital only grows. With investments, trickle provides runway against exhaustion.

## Recommendation

**No tuning needed.** Current constants (1/turn, max +20) give ~20-turn runway to cap; sufficient for Sep 1991’s ~30-turn Phase 0. If gameplay shows dead turns from capital exhaustion, consider raising `PREWAR_CAPITAL_TRICKLE_MAX_BONUS` (e.g. 25–30) or scenario-specific overrides.
