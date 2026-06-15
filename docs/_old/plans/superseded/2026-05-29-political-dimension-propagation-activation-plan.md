# Political-Dimension Propagation (PDP) Activation Plan

**Date:** 2026-05-29
**Status:** ACTIVE planning-grade (decision + execution path). No code, no scenario runs, no commits authorized by this document.
**Owner lane:** Scenario-Creator-Runner-Tester (calibration) + User (activation is user-gated)
**Authoritative source:** `docs/40_reports/proposals/20260529_PHASE_E_VERDICT_CONSOLIDATED.md` (adjudicated final verdict)
**Procedure source:** `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md`
**Readiness source:** `docs/40_reports/proposals/20260529_PHASE_E_ACTIVATION_READINESS.md`
**Collision rules:** This plan touches NO source. Execution (when authorized) flips env vars only for `intl_only`; the `cohesion_only` path depends on a code change owned by a SEPARATE lane (cohesion divisor fix). Do NOT bundle the divisor fix into PDP activation. One-change-per-calibration-run is SACRED.

---

## 1. Objective

Decide and stage the activation of the shipped-but-OFF Political-Dimension Propagation feature flags so that political dimensions (`international_standing`, `internal_cohesion`) propagate into bot corps-CO op-launch behavior, **without regressing the current 656/712 calibration baseline and without shipping a historically implausible 1992 dynamic.**

Flags in scope (all default OFF, baseline byte-identical):

- Umbrella tier-1: `AWWV_POLITICAL_DIMENSION_PROPAGATION`
- Sub-flag: `AWWV_PDP_INTL_STANDING_OPS_HESITATION` (`international_standing < 30 → 0.7×` op-launch ease)
- Sub-flag: `AWWV_PDP_COHESION_CAUTION_BIAS` (`internal_cohesion < 40 → 0.85×` op-launch ease)

**Why now:** the substrate ships with a 50-test suite that has never run against a production baseline; the adjudicated verdict (`VERDICT_CONSOLIDATED §2`) cleared `intl_only` to **conditional-GO** (the prior sign-bug NO-GO was withdrawn), and the only remaining gate for `intl_only` is a baseline refresh + sign-off. Activating turns theoretical substrate into a measured, accepted political-dimension channel.

## 2. Scope & Non-Scope

**In scope:**
- The activation **decision** (which flag, what order, what threshold) and the **execution path** (diagnostic → flip → measure → sign-off → canonicalize) per the activation procedure.
- Measurement methodology grounded in the J1 ON-vs-OFF flip-set diff.
- Surfacing the 5 open readiness questions with recommended answers + decision owners.

**Non-scope (explicit):**
- **The cohesion divisor fix is NOT part of this plan.** It is a calibration bug-of-omission (`strategic_dimensions.ts:111` `/3→/300`; `political_personality.ts:308-309` `/6→/600` — missed consumers in the 2026-05-22 100× `war_exhaustion` rescale at commit `59511672`) owned by the calibration team (`claude/calibration-historical-army-arc-2026-05-24`), handoff `docs/40_reports/20260529_CALIBRATION_HANDOFF_COHESION_DIVISOR.md`. This plan **references it as a hard dependency** for `cohesion_only`, does not duplicate or schedule it.
- The cohesion threshold recalibration (40→~10) — a deferred follow-up owned by gameplay-programmer + game-designer + canon-compliance-reviewer (`VERDICT_CONSOLIDATED §6`), only relevant AFTER the divisor fix.
- `patron_confidence`/`military_credibility` wirings (DEFERRED per procedure §8).
- `both_on` — gated behind both single channels being individually accepted + baselined.

## 3. Current-State Findings

### 3.1 Flag wiring (verified)
- Two-tier gate: tier-1 umbrella forces all sub-flags inert when OFF. Sub-flags compute a multiplier only when both their own flag AND the umbrella are ON.
- Helpers: `getIntlStandingOpsHesitationMultiplier` and `getCohesionCautionBiasMultiplier` (`src/sim/combat/sector_offensive.ts:244-261, 291-309`). Both return `1.0` fast-path when input is `undefined`/`NaN`/at-or-above threshold.
- Consumer chain (`src/sim/combat/commander/emit.ts buildOperations`): `combinedMult = intlMult × cohesionMult`; `effectiveMinForOp = Math.ceil(baseMinForOp / combinedMult)`. **A multiplier <1 RAISES the brigade-count launch floor → FEWER ops** (`ceil(2/0.7)=3`). Sign is **correct** — this is the intended "more hesitant" semantic. (`VERDICT_CONSOLIDATED §4.2`.)

### 3.2 Shipped thresholds
| Sub-flag | Dimension | Threshold | Mult below | Comparison |
|---|---|---|---|---|
| `AWWV_PDP_INTL_STANDING_OPS_HESITATION` | `international_standing` | 30 | 0.7× | strict `<` |
| `AWWV_PDP_COHESION_CAUTION_BIAS` | `internal_cohesion` | 40 | 0.85× | strict `<` |

### 3.3 The cohesion-base floor-clamp problem (`VERDICT_CONSOLIDATED §4.1`)
Post-rescale turn-40 `war_exhaustion` ≈ 4750-7940. The two missed divisors still divide `exhaustion/3` and `exhaustion/6`, saturating the cohesion-base formula and **flooring all three factions' `internal_cohesion` base at 0**. The discriminator therefore rests entirely on `event_modifier`. Net effect: the cohesion gate at threshold 40 is **not a faction-asymmetric trigger — it acts as a near-universal 0.85×** ("war is happening" rather than "this faction's cohesion crossed into the war-exhaustion regime").

### 3.4 Observed turn-40 distributions (readiness §3, J1 Tier-1 math projection)
| Faction | `international_standing` | `internal_cohesion` | intl trips (<30)? | cohesion trips (<40)? |
|---|---|---|---|---|
| HRHB | 11.68 | 2.83 | YES | YES |
| RBiH | 34.76 | 0.00 | NO | YES |
| RS | 0.00 | 12.74 | YES | YES |

- `intl_only`: **selective** trip (HRHB + RS; RBiH spared at 34.76) — matches historical signal (RS pariah, HRHB post-Mostar isolation, RBiH retained international advocacy).
- `cohesion_only`: **universal** trip (3/3 sub-40) — no asymmetry; gate degenerate at threshold 40 until divisor fix + recalibration.

### 3.5 J1 simulator status (fix LANDED)
`tools/diagnostics/phase_e_activation_simulator.ts` now keys classification on the **ON-vs-OFF territorial flip-set** (the flag's TRUE effect), running `global_off` once as the OFF side. This corrects the prior defect where the within-run `control_delta.json` was surfaced as if it were a flag effect (the misread that produced the spurious "122-OSID cascade"). `control_delta.json` is a **within-run** total (`computeControlDelta(initialSnapshot, finalSnapshot)`, `scenario_runner.ts:2969`) — the war's land-grab trajectory, present identically in every run, NOT a per-flag delta. Measurement MUST use the J1 ON-vs-OFF diff, never within-run `control_delta`.

## 4. Dependency Graph & Sequencing

```
                         [Cohesion divisor fix]  (SEPARATE LANE — calibration team)
                          /3→/300 , /6→/600
                                   │ forces baseline refresh
                                   ▼
   [intl_only]  ──independent──►  [Cohesion threshold recalibration 40→~10]
   conditional-GO                          │
        │                                  ▼
        └────────────►  [cohesion_only]  ──┘  BLOCKED until both above land + baseline re-canonicalized
                                   │
                                   ▼
                              [both_on]   (only after BOTH single channels individually accepted + baselined)
```

**Hard dependency:** `cohesion_only` is **BLOCKED** on (a) the cohesion divisor fix landing and the baseline re-canonicalizing, then (b) the threshold recalibration (40→~10). `intl_only` has **no dependency** on either — it is independently activatable today, gated only on a baseline refresh + sign-off.

**Recommended order (Readiness §8 Option C→A→B, reconciled with the verdict):**
1. (Owned elsewhere) Cohesion divisor fix + baseline recanonicalization — calibration team.
2. (Owned elsewhere) Cohesion threshold recalibration to ~10 — gameplay-programmer + game-designer + canon-compliance-reviewer.
3. **`intl_only` activation** (this plan, §5.1) — independent; can proceed in parallel with steps 1-2 since it does not touch the cohesion path.
4. **`cohesion_only` activation** (this plan, §5.2) — only after steps 1-2 complete.
5. `both_on` — after 3 and 4 are each accepted + baselined.

> Note: although the readiness doc labels it "C→A→B", `intl_only` (A) does not actually wait on the cohesion recalibration (C). The only reason A is sequenced as the *first activation flip* is risk ordering (most-tested, faction-asymmetric, no code change). If the user prefers, `intl_only` may be flipped before the divisor fix lands.

## 5. Per-Flag Activation Step Plan

Execute step by step. Do NOT batch. One activation = one calibration run = one sign-off (SACRED).

### 5.1 `intl_only` (conditional-GO — independent)

| Step | Action | Tool / artifact | Gate |
|---|---|---|---|
| I-0 | Confirm prerequisites: calibration branch merged to main; this branch merged on top with the 8-file conflict resolution; OFF-baseline byte-identical across `apr1992_52w`, `mar1993_40w`, `dec1993_40w` (procedure §2). | baseline regression | All three hold or STOP |
| I-1 | **Diagnostic baseline (flags OFF).** Record per-faction `international_standing` distribution across each calibration scenario. | `tools/diagnostics/political_dimensions_snapshot.ts --json` | Record only |
| I-2 | **Global tier-1 ON, no sub-flag.** Re-run baseline regression. Expect byte-identical. | `$env:AWWV_POLITICAL_DIMENSION_PROPAGATION="true"` | Byte-identical or HALT (gate leak) |
| I-3 | **Flip `intl_only`.** `$env:AWWV_PDP_INTL_STANDING_OPS_HESITATION="true"`. Run the J1 simulator ON-vs-OFF flip-set diff for `apr1992_52w` (+ `mar1993_40w`, `dec1993_40w`). | `phase_e_activation_simulator.ts --run-scenarios --combo intl_only --json` | Measure flip-set magnitude + calibration % delta |
| I-4 | **Measure:** (a) ON-vs-OFF territorial flip-set size + which OSIDs flip + which faction; (b) calibration % delta vs current 656/712; (c) `activity_summary.json` op-launch counter shift (expect fewer ops for HRHB+RS). | J1 diff + anchor/benchmark scoring | Expect single-to-low-double-digit flip-set (per R28/R29 cascade scale), HRHB+RS slowing, RBiH untouched |
| I-5 | **Historian sign-off (1992 plausibility).** Does slowing HRHB+RS op tempo while RBiH is unaffected at turn-40 read as plausible for 1992? (Verdict flags `intl_only` as "historically questionable for 1992" — the RS land-grab was *not* internationally hesitant in 1992; pariah pressure built later.) | `/historian` | GO only if plausible OR threshold/timing tuned |
| I-6 | **Calibration go/no-go.** Accept if flip-set + % delta within acceptance (procedure §5: RBiH & RS control delta within ±2% at 188w on `apr1992_52w`) AND historian signs off. | calibration team + user | GO → I-7; else tune or rollback (§9) |
| I-7 | **Canonicalize.** `UPDATE_BASELINES=1` regression run (post sign-off only). Record new baseline hash (40w + 188w), dimension snapshot at canonicalization, new calibration %. | `UPDATE_BASELINES=1 run_baseline_regression.ts` | New baseline committed by calibration lane |

### 5.2 `cohesion_only` (BLOCKED — gated on divisor fix + recalibration)

**Precondition (must ALL hold before C-0):** cohesion divisor fix landed (`/3→/300`, `/6→/600`); baseline re-canonicalized on the fixed engine; cohesion threshold recalibrated (40→~10) with a new test row. If any is missing → DO NOT START.

| Step | Action | Tool / artifact | Gate |
|---|---|---|---|
| C-0 | Re-run diagnostic baseline (flags OFF) on the **post-divisor-fix** engine. Cohesion bases should now be faction-differentiated (not all floored at 0). | `political_dimensions_snapshot.ts --json` | Confirm asymmetry exists; else threshold work incomplete |
| C-1 | Global tier-1 ON, no sub-flag → byte-identical re-check (if not already ON from §5.1). | env flip | Byte-identical or HALT |
| C-2 | Flip `cohesion_only`. J1 ON-vs-OFF flip-set diff. | `--combo cohesion_only --json` | Measure |
| C-3 | Measure flip-set + calibration % delta + op-launch shift. With recalibrated threshold (~10), expect HRHB+RBiH-side slowing, RS spared. | J1 diff + scoring | Expect faction-asymmetric, NOT universal |
| C-4 | Historian sign-off (cohesion-collapse plausibility per faction/era). | `/historian` | GO if plausible |
| C-5 | Calibration go/no-go (procedure §5: all-faction control delta within ±3% at 188w). | calibration team + user | GO → C-6 |
| C-6 | Canonicalize (`UPDATE_BASELINES=1`), record hash + snapshot + %. | regression | New baseline |

## 6. The 5 Open Readiness Questions (recommended answers + owner)

(Readiness §9.)

| # | Question | Recommended answer | Decision owner |
|---|---|---|---|
| 1 | Approve `internal_cohesion` threshold recalibration? What value? Land pre- or post-merge? | **YES, recalibrate to ~10 — but ONLY after the cohesion divisor fix lands** (recalibrating against floored-at-0 bases is meaningless). Re-sample across canonical scenarios (turns 4/16/40/104/188 on `apr1992_52w` + `mar1993_40w` + `dec1993_40w`) before locking a number; do NOT trust the turn-40 snapshot alone. Land on the calibration branch (post-merge), bundled with the divisor-fix baseline refresh — keeps it one calibration change. | User approves direction; **calibration** owns value + landing |
| 2 | Approve activation order? | **C→A→B with the §4 reconciliation:** divisor fix + recalibration (elsewhere) → `intl_only` first flip (independent, faction-asymmetric, most-tested, zero code) → `cohesion_only` second → `both_on` last. | User |
| 3 | Defer until calibration merge? What triggers revisit? | **For `intl_only`: do NOT defer** — it is independent and conditional-GO; proceed once prerequisites I-0 hold. **For `cohesion_only`: YES defer**, revisit trigger = divisor fix landed + 188w-stable baseline canonicalized + threshold recalibrated. | User |
| 4 | RBiH zero-floor cohesion (0.00 at turn 40) — expected? | **NO, it is a floor-clamp artifact of the missed divisor** (now diagnosed — `VERDICT §4.1`). It is NOT a separate gameplay-programmer investigation; it resolves with the divisor fix. It must NOT muddy `intl_only` activation (which does not read cohesion). | Calibration (folded into divisor fix) |
| 5 | Magnitude probe on Tier 2 drift? | **SUPERSEDED — no longer needed as a separate JSON-delta probe.** The J1 simulator fix now emits the ON-vs-OFF territorial flip-set (true magnitude) directly. Use the J1 flip-set output (step I-4 / C-3) as the magnitude signal; only diff raw saves if the flip-set is ambiguous. | Calibration (use J1 output) |

## 7. Measurement Methodology

- **PRIMARY metric: J1 ON-vs-OFF territorial flip-set** (`phase_e_activation_simulator.ts --run-scenarios --combo <combo> --json`). The simulator runs `global_off` as the OFF side and diffs final OSID→controller maps. This is the flag's TRUE effect.
- **DO NOT use within-run `control_delta.json` as a flag metric.** It is the war start→end trajectory (`computeControlDelta(initial, final)`, `scenario_runner.ts:2969`); it reports the same ~+85 RS land-grab in every run regardless of flag state. Misreading it as a flag delta is exactly the error the J1 fix corrects (`VERDICT §3, §5.3`).
- **Calibration scoring:** anchors (27/27), benchmarks (6/6), count-weighted % vs current **656/712 (92.1%, n136, hash `39d5d0c09a4666c8`)** on `mar1993_40w`; 188w match for the long arc.
- **Op-launch shift:** `activity_summary.json` counter (expect fewer ops for sub-threshold factions).
- **Per-faction acceptance bands** (procedure §5): `intl_only` RBiH+RS control delta within ±2% at 188w; `cohesion_only` all-faction within ±3% at 188w.

## 8. Verification Gates

| Gate | Condition | NO-GO |
|---|---|---|
| OFF-baseline regression | Byte-identical across `apr1992_52w`, `mar1993_40w`, `dec1993_40w` before any flip | Any drift = halt |
| Global tier-1 plumbing | tier-1 ON / no sub-flag = byte-identical | Drift = gate leak, halt |
| 40w + 188w hash | Recorded pre- and post-activation; documented in baseline refresh | Unexplained drift = stop |
| Anchors / benchmarks | 27/27 anchors, 6/6 benchmarks held or improved | Regression = no-go |
| Calibration % | ≥ current 656/712, OR an accepted historically-justified trade documented + signed off | Unexplained regression = no-go |
| Short-scenario stability | `baseline_ops_4w`, `noop_4w` all artifacts FLAT | Any drift in `noop_4w` = gate leak, halt |
| Phase D isolation | No state mutation on dimensions NOT covered by the active sub-flag | Any leak = halt |
| Historian sign-off | 1992 plausibility confirmed for the active channel | Implausible = tune/defer |

## 9. Risks, Rollback, Owner, Definition of Done

### Risks
1. **Non-neutral activation regresses calibration.** `intl_only` is NOT baseline-neutral (real BOT-MILITARY hash drift on 52w; `VERDICT §4.2`). Mitigation: J1 flip-set magnitude probe before canonicalizing; accept only within ±2% bands.
2. **Historical implausibility for 1992.** The verdict explicitly flags `intl_only` as "historically questionable for 1992" — pariah pressure built post-1992, so slowing the RS land-grab at turn-40 may be ahistorical. Mitigation: historian sign-off (I-5) is a hard gate; consider a turn-gate / ramp on the channel if implausible.
3. **Coupling — multiple flags ON are not additively neutral.** `both_on` stacks `0.7×0.85=0.595×` for HRHB+RS (40.5% harder op-launch). Mitigation: `both_on` only after BOTH single channels individually accepted + baselined; never co-activate as a first step.
4. **Cohesion gate degeneracy.** Until divisor fix + recalibration, `cohesion_only` is a near-universal 0.85× (not a discriminator). Mitigation: hard-block `cohesion_only` until §5.2 preconditions hold.
5. **Baseline-refresh provenance.** Canonicalizing with a flag ON changes the canonical baseline. Mitigation: `UPDATE_BASELINES=1` only post sign-off; record hash + flag-state + dimension snapshot at canonicalization.

### Rollback (env-var only — no code revert, no save migration)
- Sub-flag: `Remove-Item Env:AWWV_PDP_INTL_STANDING_OPS_HESITATION` (or `..._COHESION_CAUTION_BIAS`).
- All sub-flags: `Remove-Item Env:AWWV_POLITICAL_DIMENSION_PROPAGATION`.
- If a baseline was already canonicalized ON and must revert: `git revert <baseline-refresh-commit>` OR re-run `UPDATE_BASELINES=1` with the flag OFF (pick cleaner provenance). Helpers return `1.0` fast-path when inactive, so unsetting the flag is byte-equivalent to no-propagation.

### Owner
- **Decision (which flag, when, threshold value):** User (activation is user-gated) + calibration team.
- **`intl_only` execution + sign-off:** Scenario-Creator-Runner-Tester (calibration).
- **Cohesion divisor fix + threshold recalibration:** calibration team (`claude/calibration-historical-army-arc-2026-05-24`) — SEPARATE lane.
- **J1 simulator:** tooling (fix already landed).

### Definition of Done
- `intl_only`: prerequisites I-0 confirmed; OFF-baseline byte-identical; J1 ON-vs-OFF flip-set measured + within ±2% bands; historian 1992 sign-off; calibration go; new baseline canonicalized with recorded 40w+188w hash, dimension snapshot, and calibration % ≥ 656/712 (or accepted documented trade). Ledger entry appended.
- `cohesion_only`: all §5.2 preconditions held; same gate set passed at ±3% bands; new baseline canonicalized. Ledger entry appended.
- Activation procedure + this plan cross-referenced; rollback verified to restore byte-identical OFF state.

## 10. Cross-References
- Adjudicated verdict: `docs/40_reports/proposals/20260529_PHASE_E_VERDICT_CONSOLIDATED.md`
- Activation procedure + rollback: `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md`
- Readiness (5 open questions, options A-D): `docs/40_reports/proposals/20260529_PHASE_E_ACTIVATION_READINESS.md`
- Calibration handoff (divisor fix): `docs/40_reports/20260529_CALIBRATION_HANDOFF_COHESION_DIVISOR.md`
- Gate helpers: `src/sim/combat/sector_offensive.ts:244-261, 291-309`
- Consumer site: `src/sim/combat/commander/emit.ts` (`buildOperations`)
- Missed divisors: `src/sim/events/strategic_dimensions.ts:111`; `src/sim/political/political_personality.ts:308-309`
- control_delta semantics: `src/scenario/scenario_runner.ts:2969`; `src/scenario/scenario_end_report.ts:107-191`
- J1 simulator (ON-vs-OFF fix): `tools/diagnostics/phase_e_activation_simulator.ts`
- Read-only diagnostic: `tools/diagnostics/political_dimensions_snapshot.ts`
- Rescale commit: `59511672`
- Current baseline: n136, 656/712, hash `39d5d0c09a4666c8`, commit `fdacd5b4`
