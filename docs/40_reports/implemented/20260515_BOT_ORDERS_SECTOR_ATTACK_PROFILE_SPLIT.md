# Bot Orders Sector Attack Profile Split

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1813`
**Baseline:** n1812 sectorMarch assignment cache, final hash `0cb626c032204372`
**Result:** n1813 final hash `0cb626c032204372`

## Summary
- Added default-off sub-labels inside `evaluateSectorAttack(...)` for operation-participant planning and execution work.
- Preserved attack branch order, target ordering, movement-order writes, and combat eligibility semantics.
- Identified execution target prediction as the dominant sector-attack sub-bucket: `.sectorAttack.executionPredictTargets` accounted for 94.286ms of the 126.089ms parent.

## Changes Made
### Sector-Attack Attribution
- Added `SECTOR_ATTACK_PROFILE_PREFIX` and `sectorAttackProfileTime(...)` alongside the existing home-defense and uncontested-occupation profile helpers.
- Timed off-assigned-front checks, planning approach discovery/pathing, execution target prediction, tactical adjacency checks, adjacent participant counts, objective approach OSID/pathing, and intermediate target filtering.
- Left the labels under `bot_orders.executeFactionDirectives.eval.*` so the existing `PERF_PROFILE_BOT_ORDERS=true` profile file remains the single bot-order profile surface.

### Regression Guard
- Extended `tests/bot_orders_perf_profile.test.ts` so profile wiring fails if the sector-attack split labels disappear.
- Red proof: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` failed on missing `SECTOR_ATTACK_PROFILE_PREFIX`.
- Green proof: focused profile/staging tests passed after implementation.

## Profile Results
The n1813 proof kept final hash `0cb626c032204372`, matching n1812/n1811/n1810/n1809/n1808/n1807/n1806/n1805/n1804/n1803/n1802.

| Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.sectorAttack` | 3,088 | 126,089,200 | 40,831 | 272,900 |
| `.sectorAttack.executionPredictTargets` | 172 | 94,286,200 | 548,175 | 1,113,700 |
| `.sectorAttack.planningApproachPath` | 121 | 5,997,500 | 49,566 | 199,200 |
| `.sectorAttack.planningApproaches` | 287 | 3,479,400 | 12,123 | 18,700 |
| `.sectorAttack.executionApproachPath` | 65 | 3,028,600 | 46,593 | 147,200 |
| `.sectorAttack.executionAdjacentParticipants` | 107 | 1,334,800 | 12,474 | 22,600 |
| `.sectorAttack.executionTacticalAdjacency` | 172 | 982,400 | 5,711 | 7,400 |
| `.sectorAttack.offAssignedFront` | 3,088 | 868,900 | 281 | 400 |
| `.sectorAttack.executionApproachOsids` | 65 | 718,000 | 11,046 | 16,800 |

The static guard also covers `.sectorAttack.executionIntermediateTargets`; the n1813 scenario did not hit that attack-through branch, so the profile file has no non-zero row for it.

Current top bot-order evaluator buckets in n1813:

| Label | Total ns |
|---|---:|
| `sectorMarch` | 128,350,500 |
| `sectorAttack` | 126,089,200 |
| `defensive` | 98,804,600 |
| `pocketEvacuation` | 89,236,400 |

## Determinism
- Profiling remains gated by `PERF_PROFILE_BOT_ORDERS=true` and writes only `data/derived/_debug/bot_orders_perf_profile.json`.
- The wrappers do not change `GameState`, save schema, branch order, candidate order, command output, RNG behavior, or serialization.
- This matches the Code Canon debug-only profiling exception and the determinism matrix requirements for stable ordering and byte-identical reruns from identical inputs.
- Profiled n1813 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_attack.ts` | Added default-off sector-attack profile sub-labels. |
| `tests/bot_orders_perf_profile.test.ts` | Guards sector-attack profile wiring. |

## Next Steps
- Optimize only after a fresh profile, because `sectorMarch` and `sectorAttack` are nearly tied at the parent level.
- Within sector attack, target prediction scope/laziness first: `.sectorAttack.executionPredictTargets` dominates the split, while approach pathing and adjacency checks are secondary.
