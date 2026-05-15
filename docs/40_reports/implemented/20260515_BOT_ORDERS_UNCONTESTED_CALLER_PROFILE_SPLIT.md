# Bot Orders Uncontested Caller Profile Split

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1830`
**Baseline:** n1829 sectorAttack direct-objective wrapper profile split, final hash `0cb626c032204372`
**Result:** n1830 kept final hash `0cb626c032204372`

## Summary
- Split `evaluateUncontestedOccupation(...)` child labels by caller while preserving the existing standalone label family.
- The split shows the largest child is still salient checking, but it is much smaller than the caller parents.
- This lane is retained as attribution only; it does not justify another uncontested-salient cache attempt.

## Changes Made
### Caller-Specific Labels
- `src/sim/combat/bot_brigade_eval_attack.ts`
  - Added a default `profileLabelPrefix = '.uncontestedOccupation'` parameter to `evaluateUncontestedOccupation(...)`.
  - Routed home-defense calls through `.homeDefense.uncontestedOccupation.*` child labels.
  - Routed defensive calls through `.defensive.uncontestedOccupation.*` child labels.
  - Left direct standalone calls under `.uncontestedOccupation.*`.

### Profile Guard
- `tests/bot_orders_perf_profile.test.ts`
  - Guards the default prefix, caller-specific call sites, helper composition, and child suffix labels.

## Scenario Results
### 40w Profile
- Final state hash: `0cb626c032204372`
- Anchor checks: 26/27
- Bot benchmarks: 6/6
- Anomalies: 9 total, 0 critical, 2 warnings

### Caller Attribution
- `homeDefense.uncontestedOccupation`: 68.865ms / 3,662 calls
- `homeDefense.uncontestedOccupation.salient`: 12.603ms / 5,699 calls
- `homeDefense.uncontestedOccupation.sectorDefense`: 4.209ms / 2,633 calls
- `homeDefense.uncontestedOccupation.defenderScan`: 1.860ms / 4,469 calls
- `defensive.uncontestedOccupation`: 21.796ms / 1,353 calls
- `defensive.uncontestedOccupation.salient`: 3.403ms / 2,269 calls
- Standalone `eval.uncontestedOccupation`: 48.505ms / 2,537 calls
- Standalone `eval.uncontestedOccupation.salient`: 8.838ms / 4,302 calls

The child labels explain only a minority of the caller parent time, and the largest child is a small salient scan that already rejected the exact faction+loc+target cache in n1824. The next CPU lane should use a fresh profile and prefer a larger measured bucket before revisiting uncontested occupation.

## Verification
- Red first: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` failed because `profileLabelPrefix = '.uncontestedOccupation'` was missing.
- Green focused guard: `npm.cmd run test:vitest:fast -- -- tests/bot_orders_perf_profile.test.ts` passed 5/5.
- Typecheck: `npm.cmd run typecheck` passed.
- Profile: `PERF_PROFILE_BOT_ORDERS=true npm.cmd run sim:scenario:run:40w -- --unique --out runs` produced n1830 with final hash `0cb626c032204372`.

## Lessons Learned
- Caller-specific label prefixes are the right way to split shared evaluator child work without duplicating logic.
- The retained standalone prefix preserves old direct-call attribution while home-defense and defensive parents get their own child breakdowns.
- Do not retry the rejected n1824 exact uncontested-salient cache shape from this split alone.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/bot_brigade_eval_attack.ts` | Adds caller-specific profile prefixes for shared uncontested occupation child labels. |
| `tests/bot_orders_perf_profile.test.ts` | Guards the new label threading and helper composition. |
| `docs/40_reports/implemented/20260515_BOT_ORDERS_UNCONTESTED_CALLER_PROFILE_SPLIT.md` | Records n1830 evidence and follow-up guidance. |

## Next Steps
- Use a fresh top profile for the next lane.
- Prefer larger buckets such as `sectorMarch`, `sectorAttack`, or `homeDefense` parent residuals before optimizing small uncontested child labels.
- If uncontested occupation is revisited, profile a new hypothesis first; do not repeat the exact faction+loc+target salient cache.
