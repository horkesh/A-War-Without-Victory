# Phase E Activation Procedure — Political Dimension Propagation Gate

## Status

- **Date:** 2026-05-28
- **Branch authored on:** `codex/diagnostics-output-artifact-doc-closeout`
- **Companion:** `docs/40_reports/implemented/20260528_PHASE_D_CLOSEOUT.md` (Phase E expansion Packets 2-4 section)
- **Engine substrate:** `src/sim/events/political_dimension_propagation_gate.ts`
- **Diagnostic:** `tools/diagnostics/political_dimensions_snapshot.ts`

## 1. Purpose

This document is the canonical activation playbook for the Phase E feature-flag chain that lets political dimensions (`international_standing`, `internal_cohesion`, and future dimensions) propagate into bot operational behavior. It exists so an operator can safely flip the flags in a production run without breaking the Phase D bot-military isolation invariant and without invalidating calibration baselines.

Read this doc before flipping any `AWWV_POLITICAL_DIMENSION_PROPAGATION` or `AWWV_PDP_*` environment variable in a baselined run.

## 2. Prerequisites

Activation MUST NOT begin until all three of the following hold:

1. The calibration branch (`claude/calibration-historical-army-arc-2026-05-24`) has shipped to `main`.
2. This branch (`codex/diagnostics-output-artifact-doc-closeout`) has been merged on top with the known 8-file conflict resolution applied (`briefing.ts`, `sector_offensive.ts`, `emit.ts`, gate module, and Phase E test files).
3. A baseline regression PASS has been recorded on the merged baseline with all Phase E flags default-OFF — i.e. byte-identical artifacts across `apr1992_52w`, `mar1993_40w`, `dec1993_40w`.

If any of the three is missing, do NOT proceed.

## 3. Architecture refresher

Phase E uses a two-tier env flag gate:

- **Global tier-1:** `AWWV_POLITICAL_DIMENSION_PROPAGATION` — master switch. When OFF, every sub-flag is forced inert regardless of its own value.
- **Per-dimension sub-flag:** e.g. `AWWV_PDP_INTL_STANDING_OPS_HESITATION`, `AWWV_PDP_COHESION_CAUTION_BIAS`. When ON (and the global tier-1 is also ON), the dimension's helper returns a non-unity multiplier and the briefing surfaces the dimension.

Default behavior (both tiers OFF):

- Political dimensions still write to `FactionCapital.strategic_dimensions[]` (Phase B/D substrate).
- Bot ops never read them — `briefing.ts` omits the `political_dimensions` field, `sector_offensive.ts` helpers return `1.0` fast-path, `emit.ts` consumer never multiplies through.
- Phase D bot-military isolation property holds.

When a sub-flag is ON:

- `briefing.ts` surfaces the dimension as an optional field on the per-corps briefing.
- `sector_offensive.ts` helpers (`getIntlStandingOpsHesitationMultiplier`, `getCohesionCautionBiasMultiplier`) compute a multiplier from the dimension value.
- `emit.ts` `buildOperations` chains: `combinedMult = intlMult * cohesionMult`, and the effective op-launch threshold becomes `Math.ceil(baseMinForOp / combinedMult)`.

Thresholds and multipliers currently shipped:

| Sub-flag | Dimension | Threshold | Multiplier when below | Comparison |
|---|---|---|---|---|
| `AWWV_PDP_INTL_STANDING_OPS_HESITATION` | `international_standing` | 30 | 0.7× | strict less-than |
| `AWWV_PDP_COHESION_CAUTION_BIAS` | `internal_cohesion` | 40 | 0.85× | strict less-than |

## 4. Activation sequence (gated rollout)

Execute step by step. Do NOT batch.

### Step A — Pre-activation diagnostic baseline

Run the diagnostic with all flags OFF across each baseline scenario:

```
node node_modules/tsx/dist/cli.mjs tools/diagnostics/political_dimensions_snapshot.ts --json --save <scenario-final-save>
```

Record per-faction dimension distribution for `international_standing` and `internal_cohesion`.

### Step B — Threshold review

Compare observed distributions against the shipped thresholds (`international_standing < 30`, `internal_cohesion < 40`). The Packet 4 smoke test on the 40w `latest_run_final_save.json` showed all three factions deeply sub-threshold on `internal_cohesion` (HRHB=2.83, RBiH=0, RS=2.95). If the same pattern is observed across each calibration scenario, the cohesion threshold may be over-eager and should be recalibrated before activation, not after.

### Step C — Global tier-1 ON only

Activate the global gate with no sub-flag set:

```
$env:AWWV_POLITICAL_DIMENSION_PROPAGATION = "true"
```

Re-run baseline regression. Expected: byte-identical to default-OFF. This step confirms the global gate plumbing is correct and that no sub-flag is implicitly ON. If drift appears here, halt — the global gate is leaking.

### Step D — First sub-flag ON

Activate the first sub-flag (recommended: `AWWV_PDP_INTL_STANDING_OPS_HESITATION`, the MVS-canonical wiring):

```
$env:AWWV_PDP_INTL_STANDING_OPS_HESITATION = "true"
```

Re-run baseline regression with `UPDATE_BASELINES=1`. Compare:

- `control_delta.json` per faction (territorial drift)
- `formation_delta.json` (brigade movement / op-execution drift)
- `activity_summary.json` (op-launch counter shift)

Calibration team reviews. If drift is within acceptance criteria (see §5), canonicalize the new baseline. Otherwise, tune the threshold or rollback (§6).

### Step E — Calibration sign-off

Acceptance for Step D requires explicit calibration team sign-off. Document the new baseline hash and the dimension-distribution snapshot at canonicalization time.

### Step F — Next sub-flag

Repeat Steps C–E for the next sub-flag (`AWWV_PDP_COHESION_CAUTION_BIAS`). Then for any future sub-flag added by subsequent Phase E packets.

## 5. Per-flag activation calibration test matrix

| Flag | Should drift | Should NOT drift | Acceptance criterion |
|---|---|---|---|
| `AWWV_PDP_INTL_STANDING_OPS_HESITATION` | `activity_summary.json` (fewer ops launched when faction `international_standing < 30`); `control_delta.json` slightly lower captures by sub-30 factions | Within-faction OOB; recruitment pools; militia spawn count | RBiH and RS control delta within ±2% of pre-activation baseline at turn 188w on `apr1992_52w` |
| `AWWV_PDP_COHESION_CAUTION_BIAS` | `activity_summary.json` (broadly fewer ops — all factions sub-threshold per E4 smoke); `control_delta.json` lower captures for all factions | Within-faction OOB; recruitment pools | All-faction control delta within ±3% of pre-activation baseline at turn 188w on `apr1992_52w` |

Use `UPDATE_BASELINES=1` only after calibration sign-off on the observed delta profile.

## 6. Rollback procedure

Phase E rollback is env-var-only — no save migration, no code revert is needed because helper functions return 1.0 fast-path when the flag is inactive and `briefing.political_dimensions` is omitted when no sub-flag is ON.

Unset the sub-flag:

```
Remove-Item Env:AWWV_PDP_INTL_STANDING_OPS_HESITATION
```

Or the global tier-1 (rolls back ALL sub-flags simultaneously):

```
Remove-Item Env:AWWV_POLITICAL_DIMENSION_PROPAGATION
```

If baselines were already canonicalized with the flag ON and need to be reverted:

- `git revert <baseline-refresh-commit>` to restore the pre-activation baseline, OR
- Re-run `UPDATE_BASELINES=1 node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts` with the flag OFF to regenerate the OFF-baseline.

Pick whichever has cleaner provenance.

## 7. Monitoring

Standing monitoring expectations once a flag is active:

- Run `political_dimensions_snapshot.ts --json` on each fresh final_save and confirm the surfaced dimensions match what the briefing expects.
- Watch `control_delta.json` / `formation_delta.json` / `activity_summary.json` across runs — they should remain stable unless a dimension threshold is crossed by event firings.
- The Phase D bot-military isolation property must continue to hold for dimensions NOT covered by an active sub-flag. If you see unexpected control flips on inactive dimensions, investigate immediately — that is a leak.

## 8. Known constraints and future work

- `patron_confidence → equipment_quality_modifier` coupling DEFERRED (Phase E priority 3). Target site `combat_math.ts` / `active_modifiers.ts` overlaps with the active calibration branch.
- `military_credibility` wiring DEFERRED (Phase E priority 4). Same reason — `force_eval.ts` is in calibration territory.
- Threshold values (`international_standing < 30`, `internal_cohesion < 40`) are architect-default guesses. The E4 diagnostic finding (all three factions deeply sub-threshold on cohesion in the 40w window) suggests these may need data-driven refinement before activation. Treat the thresholds as adjustable architect parameters, not engine constants.
- Each future dimension wiring will receive its own sub-flag and its own activation step in this sequence.

## 9. Quick-reference command set

```bash
# Diagnostic (read-only — safe under any flag state)
node node_modules/tsx/dist/cli.mjs tools/diagnostics/political_dimensions_snapshot.ts --json

# Activation (env-var flip)
$env:AWWV_POLITICAL_DIMENSION_PROPAGATION = "true"
$env:AWWV_PDP_INTL_STANDING_OPS_HESITATION = "true"

# Verify drift
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts

# Canonicalize new baseline (post calibration sign-off only)
UPDATE_BASELINES=1 node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts

# Rollback
Remove-Item Env:AWWV_PDP_INTL_STANDING_OPS_HESITATION
Remove-Item Env:AWWV_POLITICAL_DIMENSION_PROPAGATION
```

## 10. Cross-references

- Phase D + Phase E expansion closeout: `docs/40_reports/implemented/20260528_PHASE_D_CLOSEOUT.md`
- Engine dimension vocabulary canonical map: `memory/engine_dimension_vocabulary.md`
- Dual-write channels lesson: `docs/life_lessons/events.md` (2026-05-28 entry)
- Gate module source: `src/sim/events/political_dimension_propagation_gate.ts`
- Helper sources: `src/sim/combat/sector_offensive.ts` (`getIntlStandingOpsHesitationMultiplier`, `getCohesionCautionBiasMultiplier`)
- Briefing extension: `src/sim/combat/commander/briefing.ts`
- Consumer site: `src/sim/combat/commander/emit.ts` (`buildOperations`)
- Diagnostic source: `tools/diagnostics/political_dimensions_snapshot.ts`
- Phase E test suite: `tests/political_dimension_propagation_gate.test.ts`, `tests/phase_e2_cohesion_caution_bias.test.ts`, `tests/phase_e3_combined_activation.test.ts`, `tests/political_dimensions_snapshot.test.ts`
