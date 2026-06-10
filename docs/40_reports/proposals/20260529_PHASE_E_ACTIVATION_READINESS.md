# Phase E Activation Readiness Report

## 1. Status and scope

- **Date:** 2026-05-29
- **Branch:** `codex/diagnostics-output-artifact-doc-closeout`
- **Author commits in scope:**
  - J1 simulator: `98de2caf` (Phase J Packet 1 — `tools/diagnostics/phase_e_activation_simulator.ts`)
  - Phase E activation procedure: `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md`
  - Phase D + Phase E expansion closeout: `docs/40_reports/implemented/20260528_PHASE_D_CLOSEOUT.md`
- **Target audience:** Calibration team (`claude/calibration-historical-army-arc-2026-05-24`).
- **What this doc decides:**
  - Go / no-go on activating `AWWV_PDP_INTL_STANDING_OPS_HESITATION` and/or `AWWV_PDP_COHESION_CAUTION_BIAS` once the calibration branch and this branch are both merged to `main`.
  - Whether the architect-default thresholds (`international_standing < 30`, `internal_cohesion < 40`) need data-driven recalibration before activation.
  - The order in which the two currently wired sub-flags should be activated.
- **What this doc does NOT decide:**
  - Anything about `patron_confidence → equipment_quality_modifier` or `military_credibility` wirings (DEFERRED per Phase D closeout §"Phase E status").
  - Anything about merging the calibration branch itself.

This is a synthesis doc consuming J1 simulator output (Tier 1 + a single Tier 2 cohesion_only × apr1992_52w probe run during authoring). Pure documentation packet. No code, no event-JSON, no scenario data is touched.

## 2. Architecture refresher (brief)

Phase E is a two-tier env-flag gate guarding two currently wired political-dimension propagation channels:

| Tier | Variable | Role |
|---|---|---|
| Global tier-1 | `AWWV_POLITICAL_DIMENSION_PROPAGATION` | Master switch; when OFF every sub-flag is inert. |
| Sub-flag (intl) | `AWWV_PDP_INTL_STANDING_OPS_HESITATION` | Wires `international_standing` into corps ops hesitation multiplier. |
| Sub-flag (cohesion) | `AWWV_PDP_COHESION_CAUTION_BIAS` | Wires `internal_cohesion` into corps caution-bias multiplier. |

Sub-flag → multiplier → consumer chain (per `src/sim/combat/commander/emit.ts buildOperations`):

```
combinedMult = intlMult * cohesionMult
effectiveMinForOp = Math.ceil(baseMinForOp / combinedMult)
```

Helpers in `src/sim/combat/sector_offensive.ts`:

- `getIntlStandingOpsHesitationMultiplier(intl)` returns `0.7` when `intl < 30`, else `1.0` (strict less-than).
- `getCohesionCautionBiasMultiplier(cohesion)` returns `0.85` when `cohesion < 40`, else `1.0` (strict less-than).
- Both helpers return `1.0` as fast-path when their respective sub-flag is OFF — sub-flag inactivity is byte-equivalent to "no propagation."

Default behavior (both tiers OFF): byte-identical to pre-Phase-E baseline across `apr1992_52w`, `mar1993_40w`, `dec1993_40w`, `baseline_ops_4w`, `noop_4w`. Confirmed in Phase D closeout §"Phase E status."

## 3. Tier 1 projection matrix

Source: J1 simulator math-only projection against `data/derived/latest_run_final_save.json` (turn 40, `harness-seed`).

Per-faction dimension snapshot at turn 40:

| Faction | `international_standing` | `internal_cohesion` |
|---|---|---|
| HRHB | 11.68 | 2.83 |
| RBiH | 34.76 | 0.00 |
| RS | 0.00 | 12.74 |

Per-combo active multiplier matrix (combined = intl × cohesion):

| Combo | HRHB intl | HRHB coh | HRHB combined | RBiH intl | RBiH coh | RBiH combined | RS intl | RS coh | RS combined | Non-trivial factions |
|---|---|---|---|---|---|---|---|---|---|---|
| `global_off` | 1.000 | 1.000 | 1.0000 | 1.000 | 1.000 | 1.0000 | 1.000 | 1.000 | 1.0000 | 0/3 |
| `global_only` | 1.000 | 1.000 | 1.0000 | 1.000 | 1.000 | 1.0000 | 1.000 | 1.000 | 1.0000 | 0/3 |
| `intl_only` | 0.700 | 1.000 | 0.7000 | 1.000 | 1.000 | 1.0000 | 0.700 | 1.000 | 0.7000 | 2/3 (HRHB, RS) |
| `cohesion_only` | 1.000 | 0.850 | 0.8500 | 1.000 | 0.850 | 0.8500 | 1.000 | 0.850 | 0.8500 | 3/3 |
| `both_on` | 0.700 | 0.850 | 0.5950 | 1.000 | 0.850 | 0.8500 | 0.700 | 0.850 | 0.5950 | 3/3 |

Key signals:

- **`intl_only`**: 2/3 factions sub-30 intl_standing trip the gate. RBiH (34.76) is the only faction above threshold at turn 40.
- **`cohesion_only`**: universal trip — all three factions are deeply sub-40 cohesion, so all three corps CO command chains inherit a 0.85× multiplier identically.
- **`both_on`**: HRHB and RS stack to 0.595× (combined effect 40.5% harder op-launch); RBiH receives the cohesion-only floor (0.85×).
- **Asymmetry note**: RBiH receives strictly weaker propagation than HRHB+RS in `intl_only` and `both_on` because its `international_standing` is the only above-threshold value in the matrix.

## 4. Empirical impact (Tier 2)

J1 simulator was run in Tier 2 mode on the `cohesion_only` combo against the canonical baseline manifest (`data/derived/scenario/baselines/manifest.json`). Single-combo run; runtime ~3.5 minutes; gate overrides reset in `finally`; NEVER wrote baselines.

Command (for re-invocation):

```
node node_modules/tsx/dist/cli.mjs tools/diagnostics/phase_e_activation_simulator.ts --run-scenarios --combo cohesion_only --json
```

### 4.1 Drift cells per artifact (raw)

`cohesion_only` × `apr1992_52w` (52-week single-corps + full event firing):

| Artifact | Status |
|---|---|
| `activity_summary.json` | FLAT |
| `control_delta.json` | FLAT |
| `end_report.md` | DRIFT |
| `final_save.json` | DRIFT |
| `formation_delta.json` | FLAT |
| `run_summary.json` | DRIFT |
| `watched_operations.json` | FLAT |
| `weekly_report.jsonl` | DRIFT |

`cohesion_only` × `baseline_ops_4w` (short ops scenario):

| Artifact | Status |
|---|---|
| All 7 artifacts | FLAT |

`cohesion_only` × `noop_4w` (no-event short scenario):

| Artifact | Status |
|---|---|
| All 7 artifacts | FLAT |

### 4.2 J1 behavioral-drift classification (deterministic, tool-emitted)

The J1 simulator's `classifyDriftSignal` (`tools/diagnostics/phase_e_activation_simulator.ts:402-424`) assigns a single behavioral label per scenario based on which baselined artifacts drift:

| Scenario | J1 signal | Drifted artifacts |
|---|---|---|
| `apr1992_52w` | `BOT-MILITARY` | `final_save.json`, `run_summary.json`, `end_report.md`, `weekly_report.jsonl` |
| `baseline_ops_4w` | `NO-DRIFT` | (none) |
| `noop_4w` | `NO-DRIFT` | (none) |

### 4.3 Interpretation envelope

The J1 tool's `BOT-MILITARY` label is conservative: it fires whenever ANY artifact in the bot-military set drifts (the set: `activity_summary.json`, `control_delta.json`, `end_report.md`, `final_save.json`, `formation_delta.json`, `run_summary.json`, `watched_operations.json`, `weekly_report.jsonl`).

The actual drift pattern observed is narrower than the label suggests:

- The "ground-truth" military-effect artifacts — `control_delta.json` (territorial outcome), `formation_delta.json` (brigade movement), `activity_summary.json` (op-launch counter), `watched_operations.json` (op narrative) — are ALL FLAT.
- Drift is confined to `final_save.json`, `run_summary.json`, `end_report.md`, `weekly_report.jsonl` — the narrative / state-snapshot / aggregate-summary surfaces.

Whether that drift profile is acceptable for activation is a **calibration team interpretation call**, not the architect's call. The architect's recommendation is in §8. The scenario-creator-runner-tester or war-or-game expert is the canonical reader of the drifted artifacts; this doc surfaces the raw cells for that hand-off.

Empirical magnitude is NOT recoverable from the J1 hash output alone — hashes carry only "same / different" semantics. A follow-up diff probe (read the actual JSON deltas between the manifest baseline `final_save.json` and the Tier 2 `final_save.json` under `data/derived/scenario/_phase_e_simulator_tmp/cohesion_only/apr1992_52w/`) is the natural next step IF the calibration team needs magnitude. That probe is out of scope for this packet.

## 5. Threshold analysis

### 5.1 Current shipped thresholds

| Dimension | Shipped threshold | Multiplier below | Comparison |
|---|---|---|---|
| `international_standing` | 30 | 0.700× | strict less-than |
| `internal_cohesion` | 40 | 0.850× | strict less-than |

### 5.2 Observed values vs threshold (turn 40 harness-seed save)

| Dimension | Threshold | HRHB | RBiH | RS | Sub-threshold count |
|---|---|---|---|---|---|
| `international_standing` | 30 | 11.68 ✓ trips | 34.76 ✗ above | 0.00 ✓ trips | 2/3 |
| `internal_cohesion` | 40 | 2.83 ✓ trips | 0.00 ✓ trips | 12.74 ✓ trips | 3/3 |

### 5.3 Per-dimension calibration assessment

**`international_standing < 30`** — Selective trip. RBiH-at-34.76 survives the cutoff. The threshold value is plausibly well-calibrated for the existing dimension dynamics: it produces faction asymmetry (HRHB+RS down, RBiH untouched) that matches the historical signal (RS pariah status post-1992; HRHB diplomatic isolation post-Mostar; RBiH retained international advocacy throughout the war). The 0.700× multiplier is aggressive but proportional to a faction operating as international pariah. **Recommendation: keep.**

**`internal_cohesion < 40`** — Universal trip. All three factions deeply sub-40 (max observed 12.74). The 40-cutoff is so loose against current cohesion dynamics that the gate ceases to discriminate at the strategic level — it is effectively a non-conditional 0.85× across the board for the full war run. This produces a uniform corps-CO hesitation that does NOT model the historical asymmetry (HRHB cohesion collapse post-Mostar bridge destruction should be a stronger signal than RBiH wartime national-unity rallying). **Recommendation: re-calibrate to a value that produces faction asymmetry against the existing dimension trajectory** — see §5.4.

### 5.4 Candidate threshold values for `internal_cohesion`

Three candidate cutoffs, evaluated against the turn-40 distribution (HRHB=2.83 / RBiH=0.00 / RS=12.74):

| Candidate | Sub-threshold factions | Asymmetry signal | Rationale |
|---|---|---|---|
| 15 | HRHB, RBiH | RS spared (12.74 < 15 = trips actually) | Better — but RS still trips at 12.74. |
| 10 | HRHB, RBiH | RS spared | Best asymmetry given observed distribution. |
| 5 | RBiH only | HRHB + RS spared | Too strict — only the zero-floor faction trips. |

Candidate `10` produces the cleanest asymmetry on current data: HRHB (cohesion collapse from camp exposure + Mostar) and RBiH (zero-floor RBiH cohesion is itself a calibration concern — see §9) trip; RS retains some institutional cohesion despite international pariah status, which matches the historical signal (Pale leadership held internal authority until the Karadžić-Mladić split in August 1995).

The candidate values above are turn-40-snapshot reasoning. Calibration team should re-sample across the canonical scenarios (`apr1992_52w` snapshots at turns 4, 16, 40, 104, 188; plus `mar1993_40w` and `dec1993_40w` snapshots) before locking a number.

## 6. Activation options (calibration team decision matrix)

### Option A — Activate `intl_only` first

| | |
|---|---|
| **Pro** | Selective trip (2/3 factions); RBiH untouched → asymmetric pressure matches historical RS+HRHB isolation. |
| **Pro** | Threshold value (30) plausibly well-calibrated; no recalibration needed. |
| **Pro** | MVS-canonical wiring — first authored, most tested (Phase E Packet 1, 11 tests). |
| **Con** | Drift on 1/2 factions of historical interest may compound with existing calibration deltas. |
| **Expected impact** | HRHB + RS corps COs launch fewer ops; territorial expansion slows; ARBiH unaffected. |
| **Rollback** | `Remove-Item Env:AWWV_PDP_INTL_STANDING_OPS_HESITATION` (env-var only). |

### Option B — Activate `cohesion_only` first

| | |
|---|---|
| **Pro** | Probe is empirically complete (Tier 2 run captured in §4). |
| **Pro** | Pattern mirrors MVS — single sub-flag activation, lowest-risk procedure. |
| **Con** | Universal trip (3/3 factions) at current threshold (40) → uniform 0.85× across all corps COs. No faction asymmetry. |
| **Con** | apr1992_52w drift in narrative+save artifacts surfaced (per §4.2). Magnitude unknown. |
| **Expected impact** | All three corps CO command chains slow op launches uniformly; net territorial deltas may be small but state-snapshot artifacts drift. |
| **Rollback** | `Remove-Item Env:AWWV_PDP_COHESION_CAUTION_BIAS` (env-var only). |

### Option C — Recalibrate cohesion threshold first, then activate

| | |
|---|---|
| **Pro** | Produces faction asymmetry in the cohesion channel (matches historical signal). |
| **Pro** | Avoids universal 0.85× propagation — gate becomes a discriminator again. |
| **Pro** | Threshold is documented as "architect-default guess" in the procedure §8 — explicitly invited to be tuned. |
| **Con** | Requires a code change (small — single constant in `sector_offensive.ts getCohesionCautionBiasMultiplier`), plus a new test row in `tests/phase_e2_cohesion_caution_bias.test.ts` covering the new threshold. |
| **Con** | Triggers a fresh Phase E test cycle; risks merge conflict with calibration branch if not landed before merge. |
| **Recommended threshold candidate** | 10 (see §5.4). |
| **Expected impact** | After recalibration: HRHB + RBiH-side corps COs receive 0.85×, RS untouched on cohesion axis. Then chainable with intl_only for combined `both_on` semantics. |
| **Rollback** | Same env-var unset; or `git revert` the threshold change. |

### Option D — Defer both indefinitely

| | |
|---|---|
| **Pro** | Zero risk of calibration-merge friction. |
| **Pro** | Phase E substrate remains in-place, available for future activation without re-work. |
| **Pro** | Frees calibration team to focus on Q4 1995 anchors without dimension-propagation noise. |
| **Con** | Phase E never actually exercises its 50-test suite against production runs — substrate is theoretical until activated. |
| **Con** | Architect-default thresholds remain unvalidated against empirical dimension trajectories. |
| **Conditions for revisit** | (a) Calibration merge complete + a 188w-stable baseline canonicalized; (b) calibration team identifies a specific behavioral gap (e.g. "VRS launches too many ops at intl_standing=0") that political-dimension propagation would address. |

## 7. Go / No-Go criteria

The calibration team should treat the following matrix as the explicit gate set. Activation is GO when **all rows in the relevant column are green** for the chosen option.

| Criterion | Source artifact | GO condition | NO-GO condition |
|---|---|---|---|
| **Bot-military FLAT** | `control_delta.json`, `formation_delta.json`, `watched_operations.json`, `activity_summary.json` | All FLAT in Tier 2 run on `apr1992_52w` | Any DRIFT → DO NOT activate without explicit calibration sign-off |
| **Narrative drift acceptable** | `end_report.md`, `weekly_report.jsonl`, `run_summary.json`, `final_save.json` | Drift confined to narrative/snapshot surfaces AND calibration team accepts it | Drift uninterpretable or unacceptable in magnitude |
| **Faction-asymmetry preserved** | Tier 1 projection matrix | Sub-threshold factions match historical signal | Universal trip without asymmetry → recalibrate threshold first |
| **Short-scenario stability** | `baseline_ops_4w`, `noop_4w` | All artifacts FLAT (confirmed §4) | Any DRIFT in noop_4w → gate leakage; halt |
| **Phase D bot-military isolation property preserved** | Dimensions NOT covered by the active sub-flag | No state mutation on inactive dimensions | Any leak → halt; investigate gate module |

Specific magnitude thresholds for "acceptable" narrative drift are calibration team's call (per `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md` §5: "RBiH and RS control delta within ±2% of pre-activation baseline at turn 188w on apr1992_52w" for intl; "All-faction control delta within ±3%" for cohesion). These are pre-existing acceptance criteria from the activation procedure; this doc inherits them.

## 8. Recommended path

**Architect + Game Designer joint recommendation: Option C (recalibrate cohesion threshold to 10 before activation), then chain Option A (intl_only), then Option B (cohesion_only).**

Rationale:

1. The §4 Tier 2 probe showed the cohesion-only activation at the current threshold produces drift on `apr1992_52w` final_save / run_summary / end_report / weekly_report. The bot-military ground-truth artifacts are FLAT, so the gate is mechanically sound, but the universal 3/3 trip across all factions means the gate is functioning as an unconditional 0.85× — not as a discriminator. Activating cohesion at threshold 40 ships a `bot caution bias` that is structurally identical to "set the floor caution multiplier to 0.85" — that is not the design intent of a political-dimension propagation gate. The gate should fire selectively when a faction's cohesion crosses into "war-exhaustion regime"; threshold 40 doesn't define that regime, it defines "war is happening."
2. Recalibrating to ~10 restores discrimination on current dimension trajectories (HRHB + RBiH trip; RS does not — matching the historical signal of Pale's institutional resilience under Karadžić-Mladić leadership until the August 1995 split).
3. Activating intl_only first after recalibration is the lowest-risk sub-flag because (a) its threshold of 30 already produces faction asymmetry and (b) the channel has been MVS-canonical since Phase E Packet 1 (most-tested wiring).
4. Activating cohesion_only second (post-recalibration) then chains cleanly with intl into the `both_on` combined-multiplier regime.

If the calibration team prefers minimum-code-change path: Option A standalone (intl_only) is acceptable and ships faction-asymmetric pressure today without touching thresholds. Defer cohesion until a recalibration window opens.

If the calibration team is risk-averse mid-arc: Option D (defer both) is acceptable and preserves all gate substrate for the next calibration cycle.

## 9. Open questions for the Pyrrhic panel

Per CLAUDE.md merge-coordination and the panel-sign-off-on-activation-impact rule (bright lines surface to the owner):

1. **Approve threshold recalibration on `internal_cohesion`?** If yes, what value? Architect recommendation: 10. Sub-questions:
   - Re-sample across canonical scenarios first, or trust the turn-40 snapshot?
   - Land the threshold change on this branch (pre-merge) or on the calibration branch (post-merge)?
2. **Approve activation order?**
   - C then A then B (architect recommendation)?
   - A standalone (lowest-code-change)?
   - D (defer both)?
3. **Defer activation until calibration merge?** If yes, what triggers the revisit? Suggested triggers: (a) calibration merge complete; (b) 188w-stable baseline canonicalized; (c) specific behavioral gap identified.
4. **RBiH zero-floor cohesion observation** — `internal_cohesion = 0.00` at turn 40 for RBiH is suspicious as a floor-clamp artifact rather than a modeled state. Is this expected? If not, it is a separate investigation for `/gameplay-programmer` on the cohesion update path. NOT blocking on Phase E activation, but it muddies the threshold-recalibration analysis above.
5. **Magnitude probe on Tier 2 drift?** Should an additional probe diff the actual JSON deltas between the manifest baseline and the Tier 2 `final_save.json` (located at `data/derived/scenario/_phase_e_simulator_tmp/cohesion_only/apr1992_52w/`)? If yes, that is a follow-up packet for scenario-creator-runner-tester or war-or-game.

## 10. Cross-references

- Phase E activation procedure: `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md`
- Phase D + Phase E expansion closeout: `docs/40_reports/implemented/20260528_PHASE_D_CLOSEOUT.md`
- J1 simulator source (commit `98de2caf`): `tools/diagnostics/phase_e_activation_simulator.ts`
- Phase E gate module: `src/sim/events/political_dimension_propagation_gate.ts`
- Phase E helpers: `src/sim/combat/sector_offensive.ts` (`getIntlStandingOpsHesitationMultiplier`, `getCohesionCautionBiasMultiplier`)
- Phase E consumer site: `src/sim/combat/commander/emit.ts` (`buildOperations`)
- Phase E briefing extension: `src/sim/combat/commander/briefing.ts`
- Phase E test suite: `tests/political_dimension_propagation_gate.test.ts`, `tests/phase_e2_cohesion_caution_bias.test.ts`, `tests/phase_e3_combined_activation.test.ts`, `tests/political_dimensions_snapshot.test.ts`
- Phase E read-only diagnostic: `tools/diagnostics/political_dimensions_snapshot.ts`
- Baseline manifest: `data/derived/scenario/baselines/manifest.json`
- Tier 2 scratch outputs (Phase J Packet 2 probe): `data/derived/scenario/_phase_e_simulator_tmp/cohesion_only/`
- Engine dimension vocabulary map: `memory/engine_dimension_vocabulary.md`
- Bot-military isolation lesson context: `docs/life_lessons/events.md` (2026-05-28 entry on dual-write channels)
