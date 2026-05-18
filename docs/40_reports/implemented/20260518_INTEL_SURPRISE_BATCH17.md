# Intel Surprise Batch 17

**Date:** 2026-05-18
**Run ID:** N/A
**Baseline:** Batch 16 low-confidence OPSEC ambush hook used fixed attacker and defender casualty multipliers.
**Result:** Batch 17 keeps the same public-safe hook but scales casualty friction by observed attacker confidence gap.

## Summary
- Continued the intel-extension surprise/ambush work with a bounded deterministic slice.
- Changed the ambush casualty helper math from binary threshold behavior to proportional confidence-gap behavior.
- Preserved the existing maximum attacker/defender casualty bounds, public `ambush_risk` label, and no-random/no-hidden-truth contract.

## Changes Made
### Combat Math
- `src/sim/combat/combat_math.ts` now interpolates ambush casualty multipliers from neutral at the low-confidence threshold to the existing maximum effect at zero observed confidence.
- The inputs remain attacker-side observed confidence and defender OPSEC only.

### Tests
- `tests/attack_resolution_osid_intel_friction.test.ts` adds a red/green regression proving lower observed confidence produces stronger attacker and defender casualty friction than a partially stale contact.

### Plan
- `docs/plans/2026-05-17-intel-extensions-plan.md` records Batch 17 progress and the remaining boundary for broader surprise modeling.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/combat_math.ts` | Scaled ambush casualty multipliers by observed confidence gap. |
| `tests/attack_resolution_osid_intel_friction.test.ts` | Added focused regression for confidence-gap scaling. |
| `docs/plans/2026-05-17-intel-extensions-plan.md` | Updated Batch 17 progress note. |
| `docs/40_reports/implemented/20260518_INTEL_SURPRISE_BATCH17.md` | Added implementation report. |

## Verification
- Red: `npx.cmd vitest run tests/attack_resolution_osid_intel_friction.test.ts` failed on the new confidence-gap assertion against the previous fixed multiplier.
- Green: `npx.cmd vitest run tests/attack_resolution_osid_intel_friction.test.ts`
- Blocked: `npm.cmd run typecheck` fails in `tests/ui/operation_aar_records_review.test.ts` because an Operation AAR fixture is missing required `casualties_inflicted`; that file is outside this task's ownership boundary.

## Next Steps
- Keep broader surprise work inside deterministic execution hooks unless a canon/spec update explicitly authorizes new state, UI fields, or random events.
