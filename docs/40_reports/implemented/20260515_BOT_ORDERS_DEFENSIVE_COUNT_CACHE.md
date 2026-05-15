# Bot Orders Defensive Front-Gap Count Cache

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1818`
**Baseline:** n1817 defensive profile split, final hash `0cb626c032204372`
**Result:** n1818 final hash `0cb626c032204372`

## Summary
- Reused the existing pass-local `corpsBrigadeCountsByOsid` cache inside `evaluateDefensive(...)` for the defensive front-gap "how many friendly brigades are already here?" check.
- Preserved direct-call behavior by keeping the legacy `countFactionBrigadesAtOsid(...)` scan when the context does not carry the pass-local cache.
- Cut `.defensive.frontGapCountHere` from 50.198ms to 0.753ms while preserving final-state hash and anchor status.

## Changes Made
### Cached All-Faction Count
- `evaluateDefensive(...)` now reads `getCorpsBrigadeCountAtOsid(ctx.corpsBrigadeCountsByOsid, null, loc)` when the directive pass supplies the count cache.
- Passing `corpsId = null` intentionally reads the all-faction `__all__` count from the existing `CorpsBrigadeCountsByOsid` structure.
- The change leaves same-turn movement deltas in the existing order-writing flow; the static snapshot cache is read-only during evaluator execution.

### Direct-Caller Fallback
- The legacy `countFactionBrigadesAtOsid(state, faction, loc)` scan remains for direct unit tests or future isolated callers that do not construct the main order-pass context.

### Regression Guard
- Added `tests/defensive_front_gap_count_cache.test.ts`.
- Red proof: the test failed before implementation because the raw state only contained one friendly brigade at `loc`, so the uncached scan did not fill the adjacent front gap.
- Green proof: after implementation, the manually adjusted cached all-faction count drives the same defensive gap-fill branch used by the order pass.

## Profile Results
The n1818 proof kept final hash `0cb626c032204372`, matching n1817/n1815/n1814/n1813/n1812/n1811/n1810/n1809/n1808/n1807/n1806/n1805/n1804/n1803/n1802.

| Label | n1817 Total ns | n1818 Total ns | Delta |
|---|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.defensive.frontGapCountHere` | 50,197,700 | 752,900 | -49.445ms |
| `bot_orders.executeFactionDirectives.eval.defensive` | 105,075,700 | 57,864,800 | -47.211ms |
| `bot_orders.executeFactionDirectives.evaluators` | 605,365,000 | 561,866,700 | -43.498ms |
| `bot_orders.executeFactionDirectives.total` | 857,886,600 | 808,942,600 | -48.944ms |

Defensive sub-labels in n1818:

| Defensive Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `.defensive.uncontestedOccupation` | 1,353 | 24,365,100 | 18,008 | 39,600 |
| `.defensive.sectorCounterAttackSectorLookup` | 1,287 | 11,359,200 | 8,826 | 13,200 |
| `.defensive.frontGapSearch` | 297 | 6,202,100 | 20,882 | 88,000 |
| `.defensive.sectorCounterAttackPredictTargets` | 4 | 2,353,300 | 588,325 | 704,700 |
| `.defensive.frontGapCountHere` | 1,365 | 752,900 | 551 | 900 |
| `.defensive.sectorCounterAttackCollectTargets` | 6 | 499,100 | 83,183 | 214,000 |
| `.defensive.deepRearNearFront` | 78 | 180,600 | 2,315 | 3,400 |

Current top bot-order evaluator buckets in n1818:

| Label | Total ns |
|---|---:|
| `sectorMarch` | 127,291,100 |
| `homeDefense` | 89,053,900 |
| `homeDefense.uncontestedOccupation` | 75,881,800 |
| `sectorAttack` | 62,032,200 |
| `defensive` | 57,864,800 |
| `uncontestedOccupation` | 52,583,000 |
| `returnToCorps` | 46,972,900 |
| `pocketEvacuation` | 19,988,500 |

## Determinism
- `corpsBrigadeCountsByOsid` is built once per faction directive pass from active formation IDs sorted with `strictCompare`.
- The evaluator only reads the cache and does not mutate `GameState`, save schema, movement/posture/attack-order sequencing, RNG state, or serialization.
- The direct-call fallback preserves legacy behavior outside the main directive pass.
- Profiled n1818 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_attack.ts` | Uses the pass-local all-faction count cache for defensive front-gap count checks. |
| `tests/defensive_front_gap_count_cache.test.ts` | Adds a red-green regression for cached front-gap count usage. |

## Next Steps
- Use a fresh profile before selecting the next bot-order target.
- Current top bot-order pressure after n1818 is `sectorMarch`, `homeDefense`, `sectorAttack`, and the remaining defensive sub-labels.
