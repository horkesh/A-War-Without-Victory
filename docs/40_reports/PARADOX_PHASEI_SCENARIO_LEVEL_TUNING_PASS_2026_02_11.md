# Paradox: Phase I Scenario-Level Military-Action Tuning Pass (2026-02-11)

## Scope

Implement per-scenario tuning knobs for the experimental Phase I military-action branch and run a compact validation sweep.

## Implementation

Added optional scenario fields (applied only when `disable_phase_i_control_flip: true`):

- `phase_i_military_action_attack_scale`
- `phase_i_military_action_stability_buffer_factor`

Wiring path:

- `src/scenario/scenario_types.ts` (schema)
- `src/scenario/scenario_loader.ts` (normalization/clamp)
- `src/scenario/scenario_runner.ts` (pass-through to turn input)
- `src/sim/turn_pipeline.ts` (pass-through to control flip)
- `src/sim/phase_i/control_flip.ts` (runtime override with deterministic defaults)

Normalization:

- Attack scale clamped to `[0.1, 2.0]`
- Stability buffer factor clamped to `[0.0, 1.0]`

## Grid definition

3x3 sweep per scenario family (all with `disable_phase_i_control_flip: true`):

- Attack scale: `0.8`, `1.0`, `1.2`
- Stability buffer: `0.1`, `0.2`, `0.3`
- Families:
  - `ethnic` (from `_tmp_ethnic_1991_no_flip_4w`)
  - `hybrid` (from `_tmp_hybrid_1992_no_flip_4w`)
  - `player_choice` (from `_tmp_player_choice_recruitment_no_flip_4w`)

Sweep artifact:

- `runs/phase_i_knob_grid_summary_w12.json`

## Results

### 12-week

| Family | Best 12w knob profile | End control (HRHB / RBiH / RS) | Displacement end (mun/total) | Notes |
|---|---|---|---|---|
| `ethnic` | `1.2 / 0.1` | 693 / 2241 / 2888 | 79 / 620404 | Better than no-flip v2 (`2958 RS`) but still worse than default (`2729 RS`) |
| `hybrid` | `1.0 / 0.1` (near-default target) | 888 / 1985 / 2949 | 68 / 534670 | Near default RS (`2955`) at 12w |
| `player_choice` | any tested profile (all identical) | 982 / 2001 / 2839 | 29 / 239697 | Knob-insensitive in tested range; all beat default (`3333 RS`) |

12w grid behavior notes:

- Ethnic: attack scale dominates outcome in tested range (`1.2` clearly better than `1.0` and `0.8`), buffer has no visible effect.
- Hybrid: `1.2` can reduce RS slightly (`2929`) but does not hold that advantage at 30w.
- Player-choice: all 9 knob combinations converge to the same 12w endpoint, indicating this branch is saturated by other constraints in this scenario family.

### 30-week

| Scenario | Mode | End control (HRHB / RBiH / RS) | Interpretation |
|---|---|---|---|
| `ethnic_1991_init_4w` | default | 667 / 2319 / 2836 | Better long-horizon balance than no-flip profiles tested |
| `_tmp_grid_ethnic_a1p2_b0p1` | best ethnic 12w profile | 683 / 2104 / 3035 | RS over-expansion at 30w |
| `hybrid_1992_init_4w` | default | 694 / 2297 / 2831 | Best long-horizon hybrid balance in current matrix |
| `_tmp_grid_hybrid_a1p0_b0p1` | best hybrid 12w profile | 958 / 1689 / 3175 | RS over-expansion (same as no-flip v2 behavior) |
| `_tmp_hybrid_1992_no_flip_tuned_4w` | no-flip tuned (`1.2/0.1`) | 931 / 1916 / 2975 | Better than `1.0` profile, still worse than default |
| `_tmp_player_choice_recruitment_4w` | default | 828 / 1665 / 3329 | RS over-expansion |
| `_tmp_grid_player_choice_a0p8_b0p1` | best grid profile | 987 / 2001 / 2834 | Strong improvement over default; same as no-flip v2 outcome |

## Go / No-Go recommendation

- `ethnic_1991` family: **NO-GO** for no-flip adoption. Best tested profile (`1.2/0.1`) still underperforms default at 12w and 30w.
- `hybrid_1992` family: **NO-GO** for replacing default globally. No tested no-flip profile beats default at 30w.
- `player_choice` recruitment family: **GO** for no-flip mode as a scenario-specific choice. Within tested knob range, profile selection is neutral (all combinations converge to same 12w/30w outputs), so keep canonical no-flip v2 defaults (`1.0/0.2`) for consistency.

## Determinism check

No nondeterministic logic added. New knobs are scalar scenario inputs, clamped deterministically, and consumed in existing sorted traversal paths.

## Attack-scale-only follow-up (requested run)

Additional sweep (buffer fixed at `0.2`):

- Families: `ethnic`, `hybrid`
- Attack scale: `0.6` to `1.4` (step `0.1`)
- 12w full sweep + 30w confirmation for top-2 per family (by 12w proximity to default RS baseline)
- Artifact: `runs/phase_i_attack_scale_sweep_summary.json`

### 12w highlights

- **Ethnic:**
  - Best RS in tested range: `a=1.4` -> `RS=2656` (below default `2729`)
  - Next-best shortlist: `a=0.6` -> `RS=2865`
- **Hybrid:**
  - Closest to default baseline (`2955`) near `a=1.0` (`RS=2949`) and `a=0.9` (`RS=2964`)
  - Very high attack (`a=1.4`) gives low RS (`2657`) but with large counter-shift (RBiH jump), indicating unstable regime versus baseline behavior

### 30w confirmations (top-2 per family)

| Family | Attack scale | End control (HRHB / RBiH / RS) | Verdict |
|---|---|---|---|
| `ethnic` | `1.4` | 649 / 2252 / 2921 | Better than no-flip-v2 (`3035`), but still worse than default ethnic (`2836`) |
| `ethnic` | `0.6` | 693 / 2033 / 3096 | Clearly worse |
| `hybrid` | `1.0` | 958 / 1689 / 3175 | Worse than default hybrid (`2831`) |
| `hybrid` | `0.9` | 941 / 1735 / 3146 | Worse than default hybrid (`2831`) |

### Updated recommendation after attack-scale sweep

- `ethnic_1991`: still **NO-GO** for replacing default. Attack-scale tuning can improve no-flip variants, but no tested 30w profile beats default.
- `hybrid_1992`: still **NO-GO** for replacing default. 12w fit does not carry to 30w.
- `player_choice`: unchanged **GO** as scenario-specific no-flip mode; attack/buffer tuning remains largely neutral in tested ranges.

