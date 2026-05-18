# Intel Ambush Batch 15

**Date:** 2026-05-18
**Baseline:** 40w n1890 `248202ee4fd13027`
**Integrated proof:** 40w n1891 `0d8d9ccdc477d77a`, 27/27 anchors, 6/6 bot benchmarks.
**Result:** Low-confidence attacks into an OPSEC-defended sector now receive deterministic ambush casualty friction.

## Summary
- Added a fixed, deterministic `ambush_risk` slice beyond the existing stale-intel attacker-power and defender-OPSEC power multipliers.
- The hook applies only when attacker confidence is in the low band and the defending sector is currently OPSEC-marked.
- Public reports expose only the coarse `ambush_risk` label plus the existing broad confidence band; exact confidence values and hidden defender truth remain private.

## Behavior
- `getIntelAmbushAttackerCasualtyMult(confidence, defenderOpsecActive)` returns `1.12` only when `defenderOpsecActive === true` and clamped confidence is below `1/3`.
- `attack_resolution_osid.ts` multiplies attacker casualty scaling by that fixed factor after power-ratio classification.
- `PublicIntelFrictionAnnotation.labels` now permits `ambush_risk`.

## Determinism And Safety
- No randomness, timestamps, hidden defender truth reads, UI-only data, schema migration, or save-version change.
- The trigger reads the same attacker-side observed sector/OSID confidence and OPSEC sector membership used by Batch 11/12.
- High-confidence OPSEC contacts and low-confidence non-OPSEC contacts remain neutral for the ambush casualty hook.

## Verification
| Command | Result |
|---|---|
| `npx.cmd vitest run tests/attack_resolution_osid_intel_friction.test.ts --reporter=dot` before implementation | Failed as expected: missing helper, missing `ambush_risk` label, and no extra attacker losses. |
| `npx.cmd vitest run tests/attack_resolution_osid_intel_friction.test.ts --reporter=dot` after implementation | Passed: 1 file, 6 tests. |
| Parent integrated focused run | Passed in `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/army_reserve_system.test.ts tests/elite_loan_recall.test.ts tests/attack_resolution_osid_intel_friction.test.ts --reporter=dot`: 4 files, 61 tests. |
| Parent integrated 40w run | Passed n1891 `0d8d9ccdc477d77a`, 27/27 anchors, 6/6 bot benchmarks; consistency validation passed. |

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/combat_math.ts` | Added deterministic ambush casualty multiplier helper/constants. |
| `src/sim/combat/attack_resolution_osid.ts` | Applies low-confidence OPSEC ambush casualty friction and public label. |
| `src/sim/combat/attack_resolution_types.ts` | Adds `ambush_risk` to public friction labels. |
| `tests/attack_resolution_osid_intel_friction.test.ts` | Covers helper, labels, neutral cases, and extra attacker losses. |

## Parent Integration
- `npm.cmd run typecheck` passed after the sector-lane nullable-corps guard fix.
- Parent 40w run produced n1891 `0d8d9ccdc477d77a`; this is an intentional hash move from n1890 because the ambush casualty hook can change combat outcomes.
- `MASTER_ROADMAP.md`, backlog, ledger, player-visible-state, and knowledge docs were updated as part of the Batch 15 integration.
