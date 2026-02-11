# Paradox: Phase I Military-Action Calibration Sweep (2026-02-11)

## Scope

Calibrate and evaluate scenario-gated Phase I military-action control behavior (`disable_phase_i_control_flip`) against current tuned default behavior.

## Config under test

- Experimental branch: `militaryActionOnly` in `src/sim/phase_i/control_flip.ts`
- Current best retained settings:
  - `MILITARY_ACTION_ATTACK_SCALE = 1.0`
  - `MILITARY_ACTION_STABILITY_BUFFER_FACTOR = 0.2`
- A tested stricter variant (`0.75` / `0.3`) was rejected (worse RS-heavy drift in ethnic/hybrid).

## 12-week matrix (Phase I only)

| Scenario | Mode | End control (HRHB / RBiH / RS) | Displacement end (mun/total) | Notes |
|---|---|---|---|---|
| `ethnic_1991_init_4w` | default | 757 / 2336 / 2729 | 86 / 678698 | RS grows strongly |
| `_tmp_ethnic_1991_no_flip_4w` | no-flip v2 | 706 / 2158 / 2958 | 75 / 582948 | More RS-heavy than default by week 12 |
| `hybrid_1992_init_4w` | default | 598 / 2269 / 2955 | 89 / 689461 | RS-heavy late |
| `_tmp_hybrid_1992_no_flip_4w` | no-flip v2 | 888 / 1985 / 2949 | 68 / 534670 | Similar RS share, lower displacement |
| `_tmp_player_choice_recruitment_4w` | default | 823 / 1666 / 3333 | 54 / 436229 | Strong RS advantage |
| `_tmp_player_choice_recruitment_no_flip_4w` | no-flip v2 | 982 / 2001 / 2839 | 29 / 239697 | Much better balance than default |

## 30-week matrix (Phase II reached)

| Scenario | Mode | End control (HRHB / RBiH / RS) | Displacement end (mun/total) | Fatigue | Notes |
|---|---|---|---|---|---|
| `hybrid_1992_init_4w` | default | 694 / 2297 / 2831 | 109 / 23.98 | 0 -> 0 | Better than no-flip in hybrid |
| `_tmp_hybrid_1992_no_flip_4w` | no-flip v2 | 958 / 1689 / 3175 | 104 / 22.88 | 0 -> 0 | RS dominance too strong |
| `_tmp_player_choice_recruitment_4w` | default | 828 / 1665 / 3329 | 81 / 17.57 | 0 -> 0 | RS dominance |
| `_tmp_player_choice_recruitment_no_flip_4w` | no-flip v2 | 987 / 2001 / 2834 | 78 / 16.91 | 0 -> 0 | Significantly improved balance |

## Recruitment check

In both default and no-flip player-choice runs:

- `[Recruitment] Mandatory: 0, Elective: 46, Skipped: control=57 manpower=104 capital=54 equipment=0`

Conclusion: recruitment is active and resource-constrained as intended after pool seeding fix.

## Casualty / fatigue check

All sweep end-reports show `Total fatigue (start -> end): 0 -> 0`.

Interpretation: these scenarios do not generate sufficient Phase II attack-order combat pressure in the tested setup; fatigue/casualty systems are present but not exercised by this sweep.

## Recommendations

1. Keep `disable_phase_i_control_flip` as an experimental scenario switch only.
2. Keep current no-flip v2 calibration (`1.0`, `0.2`) as baseline; do not adopt stricter tested variant.
3. Use no-flip v2 mainly for recruitment-centric scenarios (clear improvement vs default).
4. For ethnic/hybrid historical scenarios, default tuned mode currently produces better medium/long-horizon balance.
5. Next calibration target: add scenario- or mode-specific military-action weighting for `ethnic_1991` and `hybrid_1992` rather than one global setting.
