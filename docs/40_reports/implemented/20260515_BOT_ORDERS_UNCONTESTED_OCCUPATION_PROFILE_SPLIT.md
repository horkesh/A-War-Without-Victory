# Bot Orders Uncontested Occupation Profile Split

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1808`
**Baseline:** n1807 home-defense profile split, final hash `0cb626c032204372`
**Result:** n1808 final hash `0cb626c032204372`

## Summary
- Split `evaluateUncontestedOccupation(...)` with default-off labels for salient checks, enemy formation scans, and sector-defense lookup.
- Identified repeated formation scanning as the leading shared uncontested-occupation cost.
- Kept serialized output stable: n1808 matched the n1807/n1806 final hash `0cb626c032204372`.

## Changes Made
### Uncontested-Occupation Attribution
- Added `UNCONTESTED_OCCUPATION_PROFILE_PREFIX` and `uncontestedOccupationProfileTime(...)`.
- Wrapped the salient-aversion neighbor count as `.uncontestedOccupation.salient`.
- Wrapped the per-candidate enemy formation scan as `.uncontestedOccupation.defenderScan`.
- Wrapped defending-sector lookup and active sector-brigade test as `.uncontestedOccupation.sectorDefense`.

### Regression Guard
- Extended `tests/bot_orders_perf_profile.test.ts` to require the new prefix and all three sub-labels.
- Red proof: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `UNCONTESTED_OCCUPATION_PROFILE_PREFIX`.
- Green proof: focused bot-order profile and guard suites passed after implementation.

## Profile Results
The n1808 proof kept final hash `0cb626c032204372`, matching n1807/n1806/n1805/n1804/n1803/n1802.

| Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `.uncontestedOccupation.defenderScan` | 9,501 | 287,853,100 | 30,297 | 64,600 |
| `.homeDefense.uncontestedOccupation` | 3,662 | 225,081,800 | 61,464 | 170,500 |
| `bot_orders.executeFactionDirectives.eval.uncontestedOccupation` | 2,537 | 148,578,900 | 58,564 | 142,200 |
| `.uncontestedOccupation.sectorDefense` | 5,248 | 57,866,900 | 11,026 | 20,100 |
| `.uncontestedOccupation.salient` | 12,270 | 22,783,000 | 1,856 | 3,400 |

Top evaluator context in n1808:
- `homeDefense`: 239.675ms parent total, still dominated by nested uncontested occupation.
- `returnToCorps`: 178.374ms.
- `sectorMarch`: 160.195ms.
- Standalone `uncontestedOccupation`: 148.579ms.

## Determinism
- Profiling remains gated by `PERF_PROFILE_BOT_ORDERS=true` and writes only `data/derived/_debug/bot_orders_perf_profile.json`.
- The wrappers preserve the old candidate order, `Object.keys(formations)` iteration, sector lookup semantics, command output, RNG behavior, save schema, and serialized state.
- Profiled n1808 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_attack.ts` | Added uncontested-occupation sub-label profiling. |
| `tests/bot_orders_perf_profile.test.ts` | Added static guard coverage for uncontested-occupation profile labels. |

## Next Steps
- Optimize repeated enemy-formation presence checks for candidate OSIDs, likely by reusing or building a per-faction active formation location index for the directive pass.
- Keep sector-defense lookup as a secondary target; it is visible but far smaller than defender scanning in n1808.
