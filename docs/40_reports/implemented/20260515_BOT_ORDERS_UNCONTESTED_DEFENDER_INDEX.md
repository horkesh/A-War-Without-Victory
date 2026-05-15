# Bot Orders Uncontested Defender Index

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1809`
**Baseline:** n1808 uncontested-occupation profile split, final hash `0cb626c032204372`
**Result:** n1809 final hash `0cb626c032204372`

## Summary
- Replaced repeated active enemy-formation scans in `evaluateUncontestedOccupation(...)` with one deterministic pass-local active formation location index.
- Preserved the old defender-presence semantics: active formations of the controller faction count at the candidate OSID, regardless of formation kind.
- Reduced `.uncontestedOccupation.defenderScan` from 287.853ms in n1808 to 3.673ms in n1809 while keeping the final state hash stable.

## Changes Made
### Active Formation Location Index
- Added `buildActiveFormationLocationsByFaction(...)` in `bot_brigade_context.ts`.
- Built the index once in `executeFactionDirectivesImpl(...)` for the faction order pass and threaded it through `BrigadeEvaluationContext`.
- Updated `evaluateUncontestedOccupation(...)` to use `hasActiveFormationAtOsid(...)` when the pass-local index is present, with the legacy full scan retained as the direct-call fallback.

### Regression Guard
- Extended `tests/bot_brigade_context_counts.test.ts` to prove the index includes active formations by faction and OSID, excludes destroyed and locationless formations, and does not filter by formation kind.
- Red proof: `npx.cmd vitest run tests\bot_brigade_context_counts.test.ts --reporter=dot` failed on the missing exported index builder.
- Green proof: the focused context-cache test and bot-order guard suite passed after implementation.

## Profile Results
The n1809 proof kept final hash `0cb626c032204372`, matching n1808/n1807/n1806/n1805/n1804/n1803/n1802.

| Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `.homeDefense.uncontestedOccupation` | 3,662 | 77,402,800 | 21,136 | 53,900 |
| `.uncontestedOccupation.sectorDefense` | 5,248 | 56,752,800 | 10,814 | 19,500 |
| `bot_orders.executeFactionDirectives.eval.uncontestedOccupation` | 2,537 | 51,171,700 | 20,170 | 45,700 |
| `.uncontestedOccupation.salient` | 12,270 | 21,767,200 | 1,774 | 3,400 |
| `.uncontestedOccupation.defenderScan` | 9,501 | 3,673,000 | 386 | 700 |

Compared with n1808:
- `.uncontestedOccupation.defenderScan`: 287.853ms -> 3.673ms.
- `.homeDefense.uncontestedOccupation`: 225.082ms -> 77.403ms.
- Standalone `eval.uncontestedOccupation`: 148.579ms -> 51.172ms.

Top bot-order evaluator context in n1809:
- `returnToCorps`: 175.480ms.
- `sectorMarch`: 162.982ms.
- `sectorAttack`: 127.241ms.
- `defensive`: 106.351ms.
- `homeDefense`: 92.081ms.

## Determinism
- The index is rebuilt from `state.military.formations` inside the deterministic faction-order pass and iterates formation IDs with `strictCompare`.
- The index is read-only during evaluation and not stored in `GameState`, so it does not affect save schema, serialization, RNG, candidate ordering, or command output.
- This matches the stable OSID-keyed iteration requirement in `docs/10_canon/Engine_Invariants_v0_9_0.md` and the `strictCompare` guidance in `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`; `docs/20_engineering/CODE_CANON.md` permits default-off profiling only outside scenario truth artifacts.
- Profiled n1809 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_context.ts` | Added active formation location index builder and lookup helper. |
| `src/sim/combat/bot_brigade_ai_osid.ts` | Builds the index once per faction directive pass and threads it through evaluator context. |
| `src/sim/combat/bot_brigade_eval_types.ts` | Adds optional active-location index field to `BrigadeEvaluationContext`. |
| `src/sim/combat/bot_brigade_eval_attack.ts` | Uses the index for uncontested-occupation defender presence checks with legacy fallback retained. |
| `tests/bot_brigade_context_counts.test.ts` | Guards active formation location index semantics. |

## Next Steps
- Use a fresh profile before choosing the next CPU lane.
- Within uncontested occupation, `sectorDefense` is now the leading sub-label at 56.753ms, but top-level bot-order evaluators now point back toward `returnToCorps`, `sectorMarch`, and `sectorAttack`.
- Do not optimize another repeated scan without same-hash profile evidence.
