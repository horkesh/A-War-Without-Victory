# Intel Surprise Batch 16

**Date:** 2026-05-18
**Baseline:** Batch 15 intel ambush hook, 40w n1891 `0d8d9ccdc477d77a`
**Result:** Focused tests pass locally; parent 40w n1893 re-anchors to `b14179d65639860c` with 27/27 anchors and 6/6 bot benchmarks.

## Summary
- Extended the bounded low-confidence + OPSEC ambush hook so prepared defenders take slightly fewer casualties as well as inflicting extra attacker losses.
- Reused the existing public-safe `ambush_risk` annotation; no new public labels, exact confidence values, hidden defender truth, or UI-only data were added.
- Kept the trigger deterministic and source-bounded: attacker-side observed sector/OSID confidence below `1/3` plus the defending sector in `opsec_sectors`.

## Changes Made
### Combat Math
- Added `INTEL_EXECUTION_AMBUSH_DEFENDER_CASUALTY_MULT = 0.94`.
- Added `getIntelAmbushDefenderCasualtyMult(...)`, mirroring the Batch 15 attacker casualty predicate.

### Attack Resolution
- Threaded the defender ambush multiplier into `computeFinalCasualties(...)` through `defCasMult`.
- Left `PublicIntelFrictionAnnotation` unchanged; `ambush_risk` remains the only public ambush explanation.

## Determinism And Safety
- No randomness, clocks, timestamps, hidden-truth UI, schema migration, save-version change, or new serialized state.
- The hook reads only existing attacker-side intel confidence and existing OPSEC sector membership.
- Neutral cases remain neutral: high-confidence OPSEC and low-confidence non-OPSEC contacts return multiplier `1`.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/combat_math.ts` | Added defender ambush casualty multiplier constant/helper. |
| `src/sim/combat/attack_resolution_osid.ts` | Applies defender casualty reduction under the same low-confidence OPSEC predicate. |
| `tests/attack_resolution_osid_intel_friction.test.ts` | Added red/green coverage for the helper and defender-loss effect. |
| `docs/plans/2026-05-17-intel-extensions-plan.md` | Recorded Batch 16 progress. |
| `docs/plans/MASTER_ROADMAP.md` | Added Batch 16 intel continuation note. |
| `docs/40_reports/CONSOLIDATED_BACKLOG.md` | Updated intel extension status and report link. |
| `docs/10_canon/Systems_Manual_v0_9_0.md` | Documented the `0.94` defender casualty multiplier. |
| `docs/20_engineering/PLAYER_VISIBLE_STATE.md` | Clarified `ambush_risk` as a staff abstraction. |
| `docs/20_engineering/REPO_MAP.md` | Added the new combat-math helper and report link. |
| `docs/PROJECT_LEDGER.md` | Added Batch 16 behavior and verification entry. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Added durable public-label/casualty-friction rule. |
| `.claude/napkin.md` | Updated current intel Batch 16 runbook note. |
| `docs/40_reports/implemented/20260518_INTEL_SURPRISE_BATCH16.md` | This implementation report. |

## Verification
| Command | Result |
|---|---|
| `npx.cmd vitest run tests\attack_resolution_osid_intel_friction.test.ts` before implementation | Failed as expected: missing `getIntelAmbushDefenderCasualtyMult`; defender casualties unchanged at 261 vs 261. |
| `npx.cmd vitest run tests\attack_resolution_osid_intel_friction.test.ts` after implementation | Passed: 1 file, 7 tests. |
| `npm.cmd run sim:scenario:run:40w` parent integration | Passed; produced n1893 `b14179d65639860c`, 27/27 anchors, 6/6 bot benchmarks. |

## Next Steps
- Broader surprise work remains open only if it preserves deterministic, source-bounded, public-label-safe behavior.
