# Bot Orders Uncontested Sector-Defense Cache

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1819`
**Baseline:** n1818 defensive front-gap count cache, final hash `0cb626c032204372`
**Result:** n1819 final hash `0cb626c032204372`

## Summary
- Added a pass-local defender-sector lookup keyed by defender faction and defended OSID.
- Reused that lookup inside `evaluateUncontestedOccupation(...)` instead of repeatedly scanning every corps-front sector in `findSectorForEnemyOsid(...)`.
- Cut `.uncontestedOccupation.sectorDefense` from 53.448ms to 6.697ms while preserving final-state hash and anchor status.

## Changes Made
### Defender-Sector Index
- Added `buildSectorDefenseByFactionAndOsid(...)` in `sector_utils.ts`, re-exported through `corps_front_sectors.ts`.
- The index preserves `findSectorForEnemyOsid(...)` precedence: sorted sector ID order, friendly-side front OSIDs first, territory OSIDs second, and first sector wins.
- `executeFactionDirectivesImpl(...)` builds the index once per faction directive pass and carries it through `BrigadeEvaluationContext`.

### Uncontested Occupation Lookup
- `evaluateUncontestedOccupation(...)` now reads `ctx.sectorDefenseByFactionAndOsid?.get(controller)?.get(n)` before falling back to `findSectorForEnemyOsid(...)`.
- The active-brigade check remains unchanged: a defending sector blocks uncontested occupation only when any assigned or reserve brigade in that sector is active.

### Regression Guard
- Added `tests/uncontested_sector_defense_cache.test.ts`.
- Red proof: the test failed before implementation because raw `corps_front_sectors` did not contain a sector, so the evaluator allowed uncontested occupation despite a cached defending sector.
- Green proof: after implementation, the cached defending sector blocks the occupation.

## Profile Results
The n1819 proof kept final hash `0cb626c032204372`, matching n1818/n1817/n1815/n1814/n1813/n1812/n1811/n1810/n1809/n1808/n1807/n1806/n1805/n1804/n1803/n1802.

| Label | n1818 Total ns | n1819 Total ns | Delta |
|---|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.uncontestedOccupation.sectorDefense` | 53,448,300 | 6,696,900 | -46.751ms |
| `bot_orders.executeFactionDirectives.eval.homeDefense.uncontestedOccupation` | 75,881,800 | 53,940,900 | -21.941ms |
| `bot_orders.executeFactionDirectives.eval.defensive.uncontestedOccupation` | 24,365,100 | 15,821,600 | -8.544ms |
| `bot_orders.executeFactionDirectives.eval.uncontestedOccupation` | 52,583,000 | 36,079,200 | -16.504ms |
| `bot_orders.executeFactionDirectives.evaluators` | 561,866,700 | 517,579,300 | -44.287ms |
| `bot_orders.executeFactionDirectives.total` | 808,942,600 | 792,167,100 | -16.776ms |

Current top bot-order evaluator buckets in n1819:

| Label | Total ns |
|---|---:|
| `sectorMarch` | 127,875,900 |
| `homeDefense` | 66,859,400 |
| `sectorAttack` | 62,057,700 |
| `homeDefense.uncontestedOccupation` | 53,940,900 |
| `defensive` | 50,625,300 |
| `uncontestedOccupation` | 36,079,200 |

## Determinism
- The index is built from `state.military.corps_front_sectors` using sector IDs sorted with `strictCompare`.
- It mirrors the legacy lookup's first-match precedence by setting each faction/OSID entry only once.
- The evaluator only reads the index and does not mutate `GameState`, save schema, order sequencing, RNG state, or serialization.
- Profiled n1819 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/sector_utils.ts` | Adds the defender-sector index builder. |
| `src/sim/combat/corps_front_sectors.ts` | Re-exports the index builder. |
| `src/sim/combat/bot_brigade_ai_osid.ts` | Builds the index once per faction directive pass. |
| `src/sim/combat/bot_brigade_eval_types.ts` | Carries the optional index on evaluator context. |
| `src/sim/combat/bot_brigade_eval_attack.ts` | Uses the cached lookup in `evaluateUncontestedOccupation(...)`. |
| `tests/uncontested_sector_defense_cache.test.ts` | Adds the red-green regression. |

## Next Steps
- Use a fresh profile before selecting the next bot-order target.
- Current bot-order pressure after n1819 is `sectorMarch`, `homeDefense`, `sectorAttack`, and remaining defensive sub-labels.
