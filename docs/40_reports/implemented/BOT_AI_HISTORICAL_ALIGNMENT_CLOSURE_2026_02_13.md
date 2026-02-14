# Bot AI Historical Alignment Closure (2026-02-13)

## Completed workstreams

1. Deterministic diagnostics added to run artifacts:
   - `run_summary.json` now includes `historical_alignment` (initial/final/delta by faction for personnel, brigade counts, recruitment capital, negotiation capital, prewar capital).
   - `phase_ii_attack_resolution` now includes defender-present vs defender-absent battle counts.
   - `phase_ii_attack_resolution_weekly` added with stable, per-week rollups.
   - `end_report.md` mirrors these diagnostics in human-readable sections.

2. Phase II strategy/posture recalibration:
   - RS made more offensive and earlier to probe/attack.
   - RBiH made more defensive (reduced attack posture share, higher threshold).
   - HRHB kept active with minor threshold easing.
   - Strategic target scoring adjusted to increase objective adherence and frontline reinforcement responsiveness.

3. Personnel growth recalibration:
   - Deterministic pool scaling reduced overgrowth in `runPoolPopulation`.
   - Result: milestone personnel totals moved substantially closer to historical envelopes.

4. Capital policy decision:
   - Concluded that capital/equipment knobs are secondary; pool intake scaling is primary for envelope control.
   - Decision memo recorded in `BOT_AI_CAPITAL_POLICY_DECISION_2026_02_13.md`.

5. Validation and determinism:
   - Typecheck and targeted test suites passed.
   - Determinism verified by repeated identical run with same hash.

## Key validation artifacts

- `runs/historical_mvp_apr1992_52w__a7d8c17fb49e148e__w30/run_summary.json`
  - `final_state_hash`: `5d153eca8e67a22f` (reproduced on repeat run)
  - Control (end): HRHB 577, RBiH 2210, RS 3035
  - Personnel (end): HRHB 43467, RBiH 134867, RS 116482
  - Brigade totals (end): HRHB 38, RBiH 112, RS 101
  - Phase II casualties: attacker 1352, defender 760
  - Defender-present vs absent battles: 550 / 68

- `runs/historical_mvp_apr1992_52w__92176a611811e603__w20/run_summary.json`
  - Personnel (end): HRHB 33222, RBiH 108800, RS 95600
  - Control (end): HRHB 568, RBiH 2358, RS 2896

## Historical-MVP status

Working historical MVP baseline is achieved for current constraints:

- AoR 3-municipality rule enforced.
- RBiH-HRHB opening alliance behavior preserved.
- Defender casualties no longer collapse to zero in Phase II activity.
- Personnel trajectories are materially closer to historical early-war bands and no longer heavily inflated across all factions.
- Deterministic reproducibility confirmed on repeated benchmark runs.

## Residual risks

- RBiH control-share benchmark at turn 26 still exceeds strict target in bot benchmark checks.
- Further tightening should be done by controlled, deterministic tuning of pool and posture constants, not by introducing nondeterministic or ad hoc per-run compensators.
