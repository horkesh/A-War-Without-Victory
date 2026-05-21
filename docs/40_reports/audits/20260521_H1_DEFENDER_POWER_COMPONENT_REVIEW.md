# H1 Defender-Power Component Review Boundary

**Date:** 2026-05-21
**Run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1931`
**Final hash:** `3099a5fabaa04d6b`
**Scope:** audit/report only. No operation behavior, OOB, scenario data, combat math, save schema, or canon text changed.

## Verdict

The H1 visibility and trace lanes have reached the autonomous evidence boundary. The watched-operation lifecycle rows now prove that Cerska-Kamenica, Krivaja-95, and Stupcanica-95 are catalog-present runtime operations that reach launch-feasibility review and fail with typed `build_defender_power_too_high` blockers. Their current failures are no longer silent injection, missing-catalog, missing-AAR, or unknown-reporting defects.

The remaining question is a sensitive-history outcome/design question: whether any of the active defender-power contributors should be changed so that one of the watched operations becomes deliverable, or whether the correct product behavior is to keep them blocked with an honest predicate. That decision is outside autonomous tuning until Q-H1-KRIVAJA-OUTCOME is resolved by the user with historian/canon review.

## Component Attribution

| Operation | Active blocker | Runtime defender attributes | Component interpretation |
|---|---|---|---|
| Cerska-Kamenica | `build_defender_power_too_high`; ratio `0.334`; attacker `215.03`; defender `643.639` | Four East Bosnian defenders, each 600 personnel, `hold`, 12 entrenchment turns, morale 42, officer quality 0.9, no decoration rows. | Not driven by supply, home-distance, fatigue, disruption, corps defense, or equipment-quality. Active lift is base power, `hold` posture `1.2`, entrenchment, terrain-class `1.575`, final environment cap, officer `1.228`, morale `1.065`, and front-density `0.778`. |
| Krivaja-95 | `build_defender_power_too_high`; ratio `0.317`; attacker `205.892`; defender `649.751`; separate `brigade_ineligible` warning for `rs_skelani_battalion` | Same four East Bosnian defenders as Cerska-Kamenica, each 600 personnel, `hold`, 12 entrenchment turns, morale 42, officer quality 0.9, no decoration rows. | Same active component pattern as Cerska-Kamenica. The ineligible Skelani warning is preserved, but the concrete no-launch row is the defender-power blocker. |
| Stupcanica-95 | `build_defender_power_too_high`; ratio `0.138`; attacker `169.937`; defender `1228.247` | `arbih_1st_cerska` has 1800 personnel, `hold`, 12 entrenchment turns, morale 42, fatigue 1, officer quality 0.9, and a tier-2 decoration awarded at turn 71. Secondary defenders are `arbih_282nd_east_bosnian_light` and `arbih_285th_light`. | Dominated by `arbih_1st_cerska` base power `457.602`, final environment cap `1.518`, officer `1.228`, morale `1.065`, and per-brigade terrain bonus `1.15` from the decoration defense bonus path. |

## Guardrails

- The apparent `1.15` Stupcanica per-brigade terrain bonus is explained by the runtime tier-2 decoration on `arbih_1st_cerska`, not by an explicit `defense_terrain_bonus` field in the source OOB row inspected for that formation.
- `src/sim/combat/decoration_evaluator.ts` maps tier-2 decoration defense bonus to `0.15`, and `src/sim/combat/combat_math.ts` uses that value only when `formation.defense_terrain_bonus` is absent.
- `tests/stupcanica_defender_stack_shape_b.test.ts` explicitly protects per-brigade terrain/decoration bonus as orthogonal to the MAX-collapsed terrain environment stack. Removing that bonus would be a deliberate behavior/design change, not a cleanup.
- The watched defenders are in `hold`, not `defend` or `dig_in`. Reducing posture would therefore affect the baseline hold-defense contract rather than correcting an exaggerated defensive stance.
- Supply, home-distance, fatigue, disruption, corps defense, and equipment-quality are not the blockers in the current run evidence.

## Autonomous Decision

Do not tune operation outcomes from this packet. H1 evidence/visibility is complete enough to close the diagnostic owner and carry the remaining outcome lane as a gated sensitive-history decision. The next autonomous work should move to non-sensitive roadmap/backlog lanes unless the user explicitly asks for the H1 behavior/canon decision.

## Verification Boundary

This audit reuses the already-passing `n1931` proof packet:

- `npx.cmd vitest run tests/operation_launch_feasibility_defender_aware.test.ts tests/triggered_operations.test.ts tests/sensitive_history_status_diagnostic.test.ts --reporter=dot` PASS (26/26).
- `npm.cmd run typecheck` PASS.
- `UPDATE_BASELINES=1 npm.cmd run test:baselines` PASS.
- `npm.cmd run test:baselines` PASS.
- `node tools\diagnostics\sensitive_history_status.cjs --json runs\apr1992_definitive_188w__210e69404d054959__w188_n1931` PASS.

This packet itself is docs-only; `git diff --check` is the local gate for this commit.
