# Bot Orders Sector March Residual Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1828`
**Baseline:** n1827 overstack destination-count profile split, final hash `0cb626c032204372`
**Result:** n1828 kept final hash `0cb626c032204372`

## Summary
- Added default-off profile labels for the sectorMarch residual checks that were still opaque after the n1827 split.
- Measured sector assignment context, pending home-return preservation, and front-membership checks.
- The new labels are small, so the remaining `sectorMarch` parent gap is not an obvious local assignment/front-membership hotspot.

## Changes Made
### Sector March Residual Labels
- `src/sim/combat/bot_brigade_eval_front.ts`
  - Wraps sector assignment context resolution in `.sectorAssignmentContext`.
  - Keeps fallback roster scanning under the existing `.assignedSectorLookup` child label.
  - Wraps the pending return-home preservation check in `.pendingHomeReturn`.
  - Wraps the sector-front membership check in `.frontMembership`.

### Profile Guard
- `tests/bot_orders_perf_profile.test.ts`
  - Guards the three new residual labels so future attribution does not silently disappear.

## Scenario Results
### 40w Profile
- Final state hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Sector March Attribution
- `.sectorMarch`: 170.891ms / 7,377 calls
- `.sectorMarch.overstackRedistribution`: 25.975ms / 5,573 calls
- `.sectorMarch.retroactiveTooth`: 16.918ms / 5,692 calls
- New `.sectorAssignmentContext`: 2.775ms / 6,781 calls
- New `.frontMembership`: 1.305ms / 5,925 calls
- New `.pendingHomeReturn`: 1.172ms / 5,925 calls
- `.frontSet`: 0.953ms / 5,925 calls

The new labels explain only a small part of the parent bucket. Because nested profile labels also inflate parent timings, n1828 should not be read as a sectorMarch regression or as evidence for optimizing these local checks.

## Verification
- Red first: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` failed because `.sectorAssignmentContext` was missing.
- Green focused guard: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` passed 5/5.
- Typecheck: `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1828 with final hash `0cb626c032204372`.

## Lessons Learned
- SectorMarch residual assignment/front-membership checks are not worth optimizing ahead of larger current buckets.
- Additional nested labels can raise the parent bucket enough that direct before/after parent comparisons become misleading.
- The next CPU lane should pivot to a larger measured bucket or a deeper, better-scoped child, not to these small residual checks.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/bot_brigade_eval_front.ts` | Adds residual sectorMarch profile labels for assignment context, pending home-return, and front-membership checks. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the new profile labels. |
| `docs/40_reports/implemented/20260515_BOT_ORDERS_SECTOR_MARCH_RESIDUAL_PROFILE_SPLIT.md` | Records n1828 evidence and follow-up guidance. |

## Next Steps
- Use a fresh top profile for the next lane.
- Do not optimize `.sectorAssignmentContext`, `.frontMembership`, or `.pendingHomeReturn` without new evidence.
- Better candidates after n1828 are `sectorAttack`, `homeDefense.uncontestedOccupation`, `defensive`, or a deeper targeted split of a remaining shared evaluator.
