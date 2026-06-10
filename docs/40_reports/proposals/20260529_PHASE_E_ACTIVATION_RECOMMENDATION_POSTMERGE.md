# Phase E Activation Recommendation — Post-Merge Update

## 1. Status + scope

- **Date:** 2026-05-29
- **Current `main`-tracking HEAD:** `7c0a2302` (`codex/fix-sensitive-source-note-issue39`), which descends from the integrated event-system + calibration merge (`abf662a0` / `295ad0fe`) and the baseline recanonicalization `fbb2b73c` (**656/712**).
- **Re-grounding save:** `data/derived/latest_run_final_save.json` — committed by `fbb2b73c`, turn 40, `harness-seed`, clean against HEAD (no working-tree diff). This is the integrated post-merge baseline save, not the stale pre-merge save J2 used.
- **Relationship to prior docs:** **UPDATES** the J2 readiness report (`20260529_PHASE_E_ACTIVATION_READINESS.md`) and **incorporates** the J3 clamp diagnosis (`20260529_RBIH_COHESION_INVESTIGATION.md`). Where this doc and J2 disagree, this doc supersedes — J2 was grounded on a pre-merge save with materially different dimension values and never ran an `intl_only` Tier 2 probe.
- **Target audience:** User (activation decision is user-gated) + calibration team (`claude/calibration-historical-army-arc-2026-05-24`) for baseline-coordination.
- **Constraint posture:** Investigation + recommendation ONLY. No code changed, no threshold edited, no flag flipped, no baseline refreshed. Tier 2 used the simulator's override setters with `try/finally` reset and NEVER touched `UPDATE_BASELINES`.

### What changed since J2

Calibration shipped the event-system + calibration integration to `main` and recanonicalized baselines to **656/712**. That integration moved the political-dimension values (especially RBiH `international_standing`) and — critically — changed the empirical Tier 2 drift profile of the `intl_only` channel. J2's central recommendation (intl_only is the safest first activation because it is bot-military-FLAT) was never tested for `intl_only`; J2's only Tier 2 run was `cohesion_only`. This doc runs the missing `intl_only` Tier 2 probe and the result reverses J2's safety assumption.

## 2. Re-grounded dimension values (current main)

Source: J1 simulator Tier 1 math-only projection against the `fbb2b73c` save (turn 40, harness-seed).

### 2.1 Per-faction dimension snapshot (current main)

| Faction | `international_standing` (eff) | base / event_mod | `internal_cohesion` (eff) | base / event_mod |
|---|---|---|---|---|
| HRHB | 8.63 | 21.63 / -13 | 0.00 (clamp-floored) | 0 / -2 |
| RBiH | 77.60 | 17.60 / +60 | 0.00 (clamp-floored) | 0 / -28 |
| RS | 0.00 (clamp-floored) | 0 / -73 | 12.00 | 0 / +12 |

### 2.2 Tier 1 multiplier matrix (5 combos × 3 factions, current main)

| Combo | HRHB combined | RBiH combined | RS combined | Non-trivial |
|---|---|---|---|---|
| `global_off` | 1.0000 | 1.0000 | 1.0000 | 0/3 |
| `global_only` | 1.0000 | 1.0000 | 1.0000 | 0/3 |
| `intl_only` | 0.7000 | **1.0000** | 0.7000 | 2/3 (HRHB, RS) |
| `cohesion_only` | 0.8500 | 0.8500 | 0.8500 | 3/3 |
| `both_on` | 0.5950 | 0.8500 | 0.5950 | 3/3 |

### 2.3 Delta vs J2 pre-merge values — calibration DID move them

| Dimension | Faction | J2 pre-merge | Current main | Delta | Significance |
|---|---|---|---|---|---|
| intl_standing | HRHB | 11.68 | 8.63 | -3.05 | still trips 30 |
| intl_standing | RBiH | 34.76 | **77.60** | **+42.84** | marginal-above → strongly-above; intl asymmetry now robust |
| intl_standing | RS | 0.00 | 0.00 | 0 | still pariah (event_mod -73) |
| cohesion | HRHB | 2.83 | 0.00 | -2.83 | base now clamp-floored |
| cohesion | RBiH | 0.00 | 0.00 | 0 | base now clamp-floored |
| cohesion | RS | 12.74 | 12.00 | -0.74 | still the lone above-zero faction |

**Key finding:** Calibration moved the values materially. The dominant mover is **RBiH `international_standing` 34.76 → 77.60** (the event system now grants RBiH a +60 `event_modifier`, modelling its sustained international advocacy / UN cooperation). RBiH was a marginal above-threshold faction in J2 (34.76 vs cutoff 30 — only 4.76 of headroom); on current main it sits at 77.60, 47.6 above the cutoff. The intl-channel asymmetry (RS+HRHB penalized, RBiH spared) is now structurally robust rather than knife-edge.

**Cohesion (J3-confirmed, sharpened):** On current main, war_exhaustion has grown to ~4750-7940 (vs ~100 in the J3 save), so `exhaustion/3` (~1580-2650) overwhelms the positive terms (max `allianceVal` 40 + `avgCohesion/2` ≤ 50 = 90). Result: **all three factions' cohesion `base_value` is now hard-clamped to 0**. Cohesion `effective_value` is therefore driven ENTIRELY by accumulated `event_modifier`: RS +12 (positive cohesion events), HRHB -2, RBiH -28. This is a sharpening of J3's clamp finding — the clamp is no longer a marginal RBiH-only artifact; it is structural across all factions late-game, and the only surviving discriminator in the cohesion channel is the sign and magnitude of event shifts.

## 3. Empirical drift (Tier 2 re-run)

Command (gate overrides reset in `finally`; baselines NEVER written):

```
node node_modules/tsx/dist/cli.mjs tools/diagnostics/phase_e_activation_simulator.ts --run-scenarios --combo intl_only --json
```

Runtime ~6 minutes; exit 0. All behavioral classification below is the J1 tool's deterministic `classifyDriftSignal` (`tools/diagnostics/phase_e_activation_simulator.ts:402-424`), source-grounded — NOT this author's interpretation.

### 3.1 `intl_only` drift cells per artifact (current main)

`intl_only × apr1992_52w`:

| Artifact | Status |
|---|---|
| `activity_summary.json` | **DRIFT** |
| `control_delta.json` | **DRIFT** |
| `end_report.md` | DRIFT |
| `final_save.json` | DRIFT |
| `formation_delta.json` | **DRIFT** |
| `run_summary.json` | DRIFT |
| `watched_operations.json` | FLAT |
| `weekly_report.jsonl` | DRIFT |

J1 deterministic signal: **`BOT-MILITARY`**.

`intl_only × baseline_ops_4w`: all 8 artifacts **FLAT** → J1 signal `NO-DRIFT`.
`intl_only × noop_4w`: all 8 artifacts **FLAT** → J1 signal `NO-DRIFT`.

### 3.2 Comparison to J2's pre-merge Tier 2 findings — the reversal

J2 ran Tier 2 only on `cohesion_only` (J2 §4). For `cohesion_only` pre-merge, the ground-truth military artifacts (`control_delta`, `formation_delta`, `activity_summary`, `watched_operations`) were ALL FLAT; only narrative/snapshot surfaces drifted. J2 then asserted (§8) that `intl_only` would be the lowest-risk first activation — but **J2 never ran an `intl_only` Tier 2 probe**. It inferred safety from the Tier 1 selective-trip pattern.

This re-run is the **first `intl_only` empirical observation**, and it contradicts that inference: on the integrated 656/712 baseline, `intl_only` produces drift in the ground-truth military artifacts — `control_delta.json` (territory), `formation_delta.json` (brigade movement), and `activity_summary.json` (op-launch counter) all DRIFT. The J1 tool classifies this `BOT-MILITARY`. The intl channel reaches the launch gate and the bot takes different actions on the 52w run; this is no longer confined to narrative surfaces.

Short-scenario stability holds: both 4-week scenarios are fully FLAT, so there is no gate leakage and the global-tier-1 plumbing is sound. The drift is a genuine behavioral effect of the intl_standing propagation on the full 52w war, not a gate bug.

### 3.3 cohesion_only

Not re-run this session (budget). J2's pre-merge `cohesion_only` Tier 2 showed bot-military-FLAT + narrative drift, but the underlying dimension distribution has since changed (RS cohesion 12.74 → 12.00, HRHB 2.83 → 0.00, war_exhaustion grew ~50×). A `cohesion_only` re-run on current main is **deferred**, with the re-run command provided:

```
node node_modules/tsx/dist/cli.mjs tools/diagnostics/phase_e_activation_simulator.ts --run-scenarios --combo cohesion_only --json
```

Because cohesion now trips all 3 factions at threshold 40 (uniform 0.85×), the expected empirical profile is broadly similar to J2's, but this is NOT verified on current main and must not be assumed for activation.

## 4. Threshold analysis (updated)

### 4.1 `international_standing` threshold 30 — confirmed, now robust

| Faction | intl (current) | vs 30 |
|---|---|---|
| RBiH | 77.60 | above (spared) — headroom +47.6 |
| HRHB | 8.63 | trips |
| RS | 0.00 | trips |

Selective trip (RS + HRHB), RBiH spared. The asymmetry matches the historical signal: RS as international pariah (war-crimes-driven, event_mod -73), HRHB diplomatic isolation post-Mostar, RBiH retaining international advocacy throughout the war (event_mod +60). The 30 cutoff was knife-edge for RBiH in J2 (4.76 headroom); on current main it is robust (47.6 headroom). **Recommendation: keep 30. No recalibration needed for the intl channel.**

### 4.2 `internal_cohesion` threshold 40 — still non-discriminating

| Threshold | Trips | Spares | Discriminating? |
|---|---|---|---|
| 40 (shipped) | RBiH, RS, HRHB | (none) | NO — universal |
| 15 | RBiH, RS, HRHB | (none) | NO — RS=12 still < 15 |
| 12 | RBiH, HRHB | RS | YES |
| 10 (J2 rec) | RBiH, HRHB | RS | YES |
| 5 | RBiH, HRHB | RS | YES |
| 1 | RBiH, HRHB | RS | YES |

At threshold 40 the cohesion gate trips all three factions identically — it functions as an unconditional 0.85× floor, not a discriminator. This is the same conclusion J2 reached, and it still holds. The **discriminating band on current main is (0, 12]**: any value ≤ 12 spares RS (cohesion=12, event-driven) and trips RBiH + HRHB (both clamp-floored at 0). J2's recommended value of **10 sits cleanly inside this band and remains valid**, with a tightened ceiling note: the cut must be ≤ 12 (J2's pre-merge band tolerated up to ~12.74; the post-merge RS value of exactly 12 lowers the ceiling marginally but 10 is unaffected).

Caveat carried from J3: because all three cohesion `base_value`s are now clamp-floored at 0, the cohesion discriminator is ENTIRELY event-modifier-driven. The threshold recalibration to 10 still produces the correct RS-spared asymmetry, but the calibration team should be aware that this asymmetry rests on event-shift accumulation, not on the formula's structural terms (which are saturated). See §7 FOLLOW-UP C.

**Recommendation: if cohesion is activated, recalibrate the threshold into (0, 12], with 10 as the confirmed value. Do NOT activate cohesion at 40.**

## 5. Activation recommendation

### 5.1 Recommended order — REVISED from J2

J2 recommended **C → A → B** (recalibrate cohesion to 10, then intl_only, then cohesion_only), premised on intl_only being bot-military-FLAT and therefore the safest first activation. The §3 Tier 2 re-run invalidates that premise: **intl_only is bot-military-DRIFT on current main**.

Revised recommendation, in descending safety:

1. **Defer-or-coordinate posture is now the honest default.** Neither sub-flag is bot-military-FLAT on the integrated baseline. intl_only drifts `control_delta` / `formation_delta` / `activity_summary` (J1: BOT-MILITARY). cohesion_only is untested on current main but trips all 3 factions uniformly. Activating EITHER sub-flag will require a baseline refresh + calibration sign-off — there is no longer a "free" zero-baseline-impact activation.

2. **If the user/calibration team wants to activate one channel first: intl_only remains the better-calibrated channel** (threshold 30 is robust and historically grounded; RBiH-spared asymmetry is clean). But it is NOT a no-op — it must go through the full Step D acceptance gate (±2% RBiH/RS control delta at 188w per the activation procedure §5) with explicit calibration sign-off and a baseline recanonicalization. The earlier "safest because flat" framing is retired.

3. **cohesion_only must be preceded by threshold recalibration to 10** (Option C) AND a fresh `cohesion_only` Tier 2 on current main. Do not activate cohesion at 40.

4. **`both_on` is last**, only after both single channels are individually accepted and baselined.

Net: the J2 ordering label "C → A → B" still holds as a *sequence of work* (recalibrate cohesion threshold before touching cohesion; do intl before cohesion; both last), but J2's *rationale* that A is a low-impact first step is revised — A now carries real bot-military drift and a mandatory baseline refresh.

### 5.2 Per-flag go/no-go against current baseline

| Flag | Tier 1 (current) | Tier 2 (current) | GO/NO-GO |
|---|---|---|---|
| `intl_only` | selective 2/3, RBiH spared, threshold robust | BOT-MILITARY drift on apr1992_52w; short scenarios FLAT | **Conditional GO** — only with calibration sign-off on the 188w control delta + baseline recanonicalization. NOT a zero-impact activation. |
| `cohesion_only` (at 40) | universal 3/3, non-discriminating | untested on current main | **NO-GO at 40** — recalibrate threshold to ≤12 first. |
| `cohesion_only` (at 10) | selective RBiH+HRHB, RS spared | untested on current main | **Conditional GO** — only after threshold recalibration (code change) + fresh Tier 2 + calibration sign-off. |
| `both_on` | combined 0.595× HRHB/RS | untested | **NO-GO** until both single channels accepted + baselined. |

### 5.3 Rollback reminder

All Phase E activation is env-var-only and reversible without code revert (helpers return 1.0 fast-path when inactive; `briefing.political_dimensions` omitted): `Remove-Item Env:AWWV_PDP_INTL_STANDING_OPS_HESITATION` (or the global tier-1 to roll back all). If a baseline was canonicalized with a flag ON, `git revert` the baseline-refresh commit or regenerate the OFF-baseline (procedure §6). The cohesion threshold recalibration (if done) additionally requires a `git revert` of the constant change.

## 6. The 5 open questions — updated answers/recommendations

J2 §9 posed 5 questions. Post-merge status:

1. **Approve `internal_cohesion` threshold recalibration? value?** — Recommendation unchanged: **10** (now confirmed against current main; discriminating band is (0, 12]). Sub-questions: (a) the turn-40 snapshot is sufficient to confirm the *band*, but calibration should re-sample across scenario turns before locking, because cohesion is now event-modifier-driven and trajectories vary by scenario; (b) land the threshold change on the calibration branch / a calibration window, NOT speculatively — it forces a baseline refresh. **Still user-gated** (code change + baseline impact).

2. **Approve activation order?** — **Revised:** the "intl_only is the safe low-impact first step" rationale is retired (§3.2). intl_only now carries bot-military drift. Order-of-work C→A→B still stands, but every step requires a baseline refresh + sign-off. **Still user-gated.**

3. **Defer activation until calibration merge?** — The calibration merge is now DONE (656/712 on main). The original deferral trigger has fired. The remaining deferral question is whether to activate now or wait for a 188w-stable baseline + a specific identified behavioral gap. Given that intl_only is bot-military-DRIFT, **recommend defer until the calibration team explicitly opens an activation window** and can absorb a baseline recanonicalization. **Still user/calibration-gated.**

4. **RBiH zero-floor cohesion (clamp artifact)?** — **Now resolvable / explained, not blocking.** J3 confirmed it is a clamp artifact. On current main it has generalized: ALL three factions' cohesion base is clamp-floored at 0 because war_exhaustion grew ~50× (exhaustion/3 saturates the formula). This does not block activation but it means the cohesion channel's discrimination rests entirely on event_modifier. Routed to FOLLOW-UP A/B/C (§7), owned by `/gameplay-programmer` + `/game-designer`. **Resolvable as a diagnosis; the formula-rebalance decision (FOLLOW-UP C) remains user-gated.**

5. **Magnitude probe on Tier 2 drift?** — **Newly relevant for intl_only.** Because intl_only now drifts `control_delta.json` + `formation_delta.json` (not just narrative), the magnitude probe matters more than J2 thought. Recommend the calibration team diff the actual JSON deltas between the manifest baseline and the Tier 2 scratch outputs at `data/derived/scenario/_phase_e_simulator_tmp/intl_only/apr1992_52w/` before activating. **Resolvable as a follow-up packet** for scenario-creator-runner-tester / war-or-game; not user-gated.

Summary: Q4 and Q5 are now resolvable (diagnosis done / follow-up packet scoped). Q1, Q2, Q3 remain genuinely user/calibration-gated (code change, baseline impact, activation-window timing).

## 7. Coordination requirements

**If the cohesion threshold is recalibrated (Option C, value 10):**
- It is a code change to `getCohesionCautionBiasMultiplier` in `src/sim/combat/sector_offensive.ts` plus a new test row in `tests/phase_e2_cohesion_caution_bias.test.ts`.
- All Phase E flags default-OFF must remain byte-identical after the change (the threshold only matters when the sub-flag is ON), so the recalibration itself is baseline-neutral until cohesion is activated.
- Land it on the calibration branch / inside a calibration window to avoid merge friction.

**If intl_only is activated:**
- It is NOT baseline-neutral (§3 shows bot-military drift on apr1992_52w). A baseline recanonicalization (`UPDATE_BASELINES=1`) is mandatory, gated on calibration sign-off that the 188w RBiH/RS control delta is within ±2% (activation procedure §5).
- The calibration team owns the recanonicalization and the sign-off.

**What is safe WITHOUT a baseline change:** Nothing in the active-flag set. The global tier-1 alone (`global_only`) is byte-identical (Tier 1 shows 0/3 non-trivial; both short scenarios FLAT and the 52w would be too since no sub-flag fires), so flipping ONLY `AWWV_POLITICAL_DIMENSION_PROPAGATION` with no sub-flag is safe and confirms plumbing — but it has zero behavioral effect.

## 8. Open questions remaining for the Pyrrhic panel

Genuinely panel-gated (bright lines surface to the owner):

1. **Activate any Phase E sub-flag now, or defer to a dedicated activation window?** Given intl_only is bot-military-DRIFT and requires a baseline refresh, this is a scheduling + risk-appetite decision the user/calibration team must make. Recommendation: defer to an explicit window.
2. **Approve the cohesion threshold recalibration to 10** (code change + eventual baseline impact)? Required before cohesion can be activated discriminatingly.
3. **Approve the FOLLOW-UP C cohesion formula rebalance** (J3 §6.3) given that all three factions' cohesion base now clamp-floors at 0 from war_exhaustion saturation? This is the deeper question of whether cohesion should be a structural dimension or remain event-modifier-driven. High-cost; calibration-window-gated.

## 9. Reviewer hand-off — key decision points

This is an investigator recommendation, not self-certified. The following need independent sign-off before any activation:

- **Canon Compliance:** Is an event-modifier-driven cohesion discriminator (all bases clamp-floored) consistent with the Systems Manual §7.10.3 definition of `internal_cohesion` as "officer loyalty, civil-military relations"? Is the 0.7×/0.85× op-launch coupling within canon for the corps-CO command chain?
- **War-or-Game:** Read the intl_only Tier 2 drifted artifacts (`control_delta.json`, `formation_delta.json` at `_phase_e_simulator_tmp/intl_only/apr1992_52w/`) — is the magnitude and direction of the territorial/formation drift historically plausible (RS+HRHB op-launch suppression while RBiH is unaffected)?
- **Historian:** Confirm the faction-asymmetry grounding — RBiH sustained international standing (event_mod +60), RS pariah (-73), HRHB isolation (-13) on intl; and RS retaining institutional cohesion (officer-corps loyalty under Pale) longer than HRHB/RBiH until the Karadžić-Mladić split (Aug 1995) on cohesion. Is threshold 10 the right cut for "war-exhaustion regime" cohesion collapse?

## 10. Cross-references

- J2 readiness (superseded by this doc): `docs/40_reports/proposals/20260529_PHASE_E_ACTIVATION_READINESS.md`
- J3 cohesion clamp investigation: `docs/40_reports/proposals/20260529_RBIH_COHESION_INVESTIGATION.md`
- Activation procedure + rollback: `docs/40_reports/implemented/20260528_PHASE_E_ACTIVATION_PROCEDURE.md`
- J1 simulator (deterministic drift classifier): `tools/diagnostics/phase_e_activation_simulator.ts` (`classifyDriftSignal` lines 402-424)
- E4 dimension reader: `tools/diagnostics/political_dimensions_snapshot.ts`
- Threshold constants: `src/sim/combat/sector_offensive.ts` (`getIntlStandingOpsHesitationMultiplier` =30/0.7, `getCohesionCautionBiasMultiplier` =40/0.85)
- Cohesion formula: `src/sim/events/strategic_dimensions.ts:102-111`
- Cohesion canon definition: `docs/10_canon/Systems_Manual_v0_9_0.md` §7.10.3 (line 549)
- Gate module: `src/sim/political/political_dimension_propagation_gate.ts`
- Consumer site: `src/sim/combat/commander/emit.ts` (`buildOperations`)
- Re-grounding save: `data/derived/latest_run_final_save.json` (committed `fbb2b73c`, 656/712)
- Calibration recanon ledger entries: `docs/PROJECT_LEDGER.md` (merge 295ad0fe, recanon fbb2b73c)
- Tier 2 scratch outputs (this session): `data/derived/scenario/_phase_e_simulator_tmp/intl_only/`
