# Phase I No-Flip Scenario Author Checklist

Use this checklist when deciding whether to enable `disable_phase_i_control_flip` for a scenario.

## Policy

- `ethnic_1991` family: keep default Phase I flip (no-flip is **not** recommended).
- `hybrid_1992` family: keep default Phase I flip (no-flip is **not** recommended).
- `player_choice` recruitment-focused family: no-flip is allowed and recommended.

## Required Configuration

1. Set `disable_phase_i_control_flip: true` only for approved scenario families.
2. Treat `disable_phase_i_control_flip: true` as **military-action-only** Phase I control:
   - Militia-pressure threshold path is disabled.
   - Brigade-led contest path is still active.
   - Settlement control changes can still occur when attacking brigade strength beats defense + stability buffer.
2. If no extra tuning is required, do not set military-action knobs; defaults apply:
   - `phase_i_military_action_attack_scale = 1.0`
   - `phase_i_military_action_stability_buffer_factor = 0.2`
3. Keep deterministic scenario JSON ordering and stable data values.
4. Prefer scenario names/IDs that describe behavior explicitly:
   - Use `military_action_only` when `disable_phase_i_control_flip: true`.
   - Avoid using `no_flip` unless a strict zero-flip mode exists.

## Validation (Minimum)

Run both short and medium horizon checks:

- `--weeks 12` and `--weeks 30`
- Confirm control trajectory remains within policy expectations:
  - player_choice no-flip (military-action-only) should reduce RS over-expansion versus default.
  - ethnic/hybrid should remain on default mode.

Verify key signals in reports:

- Recruitment activates and stays resource-constrained.
- Displacement is non-zero and plausible.
- No determinism warnings or unstable ordering artifacts.

## Canon and Scope Guardrails

- Treat no-flip as scenario-gated implementation policy, not a global Phase I replacement.
- Do not change canonical ethnic/hybrid historical scenarios to no-flip without new canon/design approval.
- If future evidence suggests a family-wide policy change, convene Paradox roles and update:
  - `docs/40_reports/PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL_2026_02_11.md`
  - `docs/PROJECT_LEDGER.md`
  - `docs/PROJECT_LEDGER_KNOWLEDGE.md`
