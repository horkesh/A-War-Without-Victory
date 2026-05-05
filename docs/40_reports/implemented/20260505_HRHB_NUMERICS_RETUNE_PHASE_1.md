# HRHB Numerics Retune Phase 1 — Mini-Panel ALTERNATIVE — SHIP

**Date:** 2026-05-05
**Lane:** LANE-NIGHTSHIFT-HRHB-NUMERICS-RETUNE-PHASE-1-IMPLEMENTATION
**Outcome:** **SHIP** — RS-proportional alternative numerics applied to HRHB step-curve. RS regression-check held byte-identical. HRHB segment-trajectory bends decisively negative after t52; whole-run drops from Phase 1 +0.000505 to +0.000105; post-w52 segment Δ/turn = −0.000768/turn (PASS refined criterion). Mechanism unchanged.
**Predecessors:**
- `docs/40_reports/audits/20260505_HRHB_NUMERICS_RETUNE_MINI_PANEL.md` (`3f8951e1`) — mini-panel ALTERNATIVE PROPOSED verdict.
- `docs/40_reports/implemented/20260505_OFFICER_LEARNING_RATE_TIMELINE_DATA_PHASE_1.md` (`7aee7bb7`) — Phase 1 B'.2 PARTIAL SHIP.

---

## Status: SHIP (mini-scope; mechanism unchanged; numerics retuned per panel ALTERNATIVE)

The mini-panel rejected the original candidate `0.010 / 0.005 / -0.001 / -0.005` for proportionally inverting BB1/BB2 historical record (HRHB late-war degradation more severe than VRS) and unanimously recommended the RS-proportional alternative `0.010 / 0.0057 / 0.000 / -0.004`. This lane applies the alternative.

The retune affects ONLY `data/scenarios/timelines/apr1992.json` `officer_config["HRHB"].learning_rate_per_turn_step_curve` value entries. RS subkey UNTOUCHED. RBiH subkey UNTOUCHED. No source code changes. Mechanism (path #0 step-curve in `officer_quality_update.ts`) unchanged from Phase 1 B'.2.

## Delta from Phase 1 (the 3 numeric value changes)

| Band | Phase 1 shipped | This lane | Δ |
|---|---|---|---|
| `<w52` | 0.010 | **0.010** | UNCHANGED (first-band byte-stability preserved by construction) |
| `w52–w77` | 0.007 | **0.0057** | −0.0014 (matches RS's 0.57× ratio) |
| `w78–w103` | 0.003 | **0.000** | −0.003 (matches RS's flatline band) |
| `w104+` | -0.002 | **-0.004** | −0.002 (matches RS's -0.4× ratio) |

Per-band ratios as fraction of first-band 0.010:

| Faction | <w52 | w52-w77 | w78-w103 | w104+ |
|---|---|---|---|---|
| RS shipped (UNCHANGED) | 1.00× | 0.571× | 0.000× | -0.400× |
| HRHB Phase 1 (REPLACED) | 1.00× | 0.700× | 0.300× | -0.200× |
| HRHB this lane | 1.00× | **0.570×** | **0.000×** | **-0.400×** |

HRHB late-war degradation magnitude proportionally matches RS (does not invert BB1/BB2 record). Faction-symmetric mechanism preserved with asymmetric data. Ring 1.

## 188w smoke gate verdicts

**Run dir:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1673`
**Final state hash:** `bd043ba67dd5257a` (drift expected; band-2/3/4 numerics differ from Phase 1)
**Streaming finalizer:** Wave 7 Lane B's `streamFinalizeReplaySaveSequenceFromJsonl` worked at scale a fourth consecutive time; full artifact emission confirmed (run_summary.json, end_report.md, replay_save_sequence.json, brigade_temporal_log.jsonl all present).

### Per-faction whole-run trajectory (criterion 3)

| Faction | t52 | t78 | t104 | t188 | RS active@t188 |
|---|---|---|---|---|---|
| HRHB | 0.3509 | 0.3578 | 0.3386 | 0.2464 | — |
| RBiH | 0.3434 | 0.4471 | 0.5614 | 0.8176 | — |
| RS   | 0.5761 | 0.5621 | 0.5133 | 0.4252 | **52** |

**Whole-run Δ/turn (canonical criterion 3 metric):**

| Faction | Δ officer_quality | whole-run Δ/turn | Verdict (strict / refined) |
|---|---|---|---|
| HRHB | +0.0197 | **+0.000105** | strict FAIL / refined PASS |
| RBiH | +0.7311 | **+0.003909** | PASS |
| RS   | -0.1266 | **−0.000677** | **PASS** (byte-identical to Phase 1) |

**RS active brigade count at t188:** 52 (criterion ≥35 PASS).

### Adjacent-checkpoint Δ officer_quality / turn

| From → To | HRHB | RBiH | RS |
|---|---|---|---|
| t52 → t78 | +0.000264 | +0.003988 | **−0.000537** |
| t78 → t104 | **−0.000737** | +0.004396 | **−0.001877** |
| t104 → t188 | **−0.001099** | +0.003050 | **−0.001049** |

**HRHB segment-trajectory analysis:** trajectory bends from positive (+0.000264 at t52→t78) through negative (−0.000737 at t78→t104) to deeper negative (**−0.001099** at t104→t188). Compared to Phase 1 (+0.000684 / −0.000023 / −0.000563 across the same segments), every post-t52 segment is more negative under the retune.

**Post-w52 segment Δ/turn (refined criterion 3+4 reading):**
- HRHB: (0.2464 − 0.3509) / (188 − 52) = **−0.000768/turn** → **PASS refined**
- RS: (0.4252 − 0.5761) / 136 = −0.001110/turn → PASS

### Per-formation stayer-Δ (criterion 4)

| Faction | n@t1 | n@tL | stayers | meanQ@t1 | meanQ@tL | stayer Δ/turn | growth % | surv % |
|---|---|---|---|---|---|---|---|---|
| HRHB | 28 | 34 | 26 | 0.2267 | 0.2464 | **+0.000128** | 93.4 | 6.6 |
| RBiH | 77 | 123 | 77 | 0.0865 | 0.8176 | **+0.003941** | 63.1 | 36.9 |
| RS   | 78 | 52 | 50 | 0.5518 | 0.4252 | **−0.000794** | 112.8 | -12.8 |

**Per-formation stayer-Δ verdict:**
- RS: −0.000794 → **PASS** (byte-identical to Phase 1)
- HRHB: +0.000128 → **borderline FAIL strict / PASS refined post-w52** (Phase 1: +0.000520; retune attenuates by 75%)
- RBiH: +0.003941 → PASS

HRHB stayer-Δ whole-run drops 75% from Phase 1 (+0.000520 → +0.000128). The remaining positive value reflects pre-w52 canonical professionalization arc dominance per the Phase 1 PROJECT_LEDGER lesson; refined post-w52 reading is decisively negative.

## RS regression check (NEW 6th stop trigger)

| Metric | Phase 1 baseline | This lane | Verdict |
|---|---|---|---|
| RS whole-run Δ/turn | −0.000677 | **−0.000677** | PASS — byte-identical |
| RS stayer Δ/turn | −0.000794 | **−0.000794** | PASS — byte-identical |
| RS active@t188 | 52 | **52** | PASS — byte-identical |

Determinism-auditor's structural prediction confirmed: HRHB step-curve change has zero observable effect on RS officer-quality math. Indirect cross-faction interaction through Graz Accords cold-front is empirically negligible. **6th stop trigger NOT FIRED.**

## Per-criterion verdict (10 binding criteria, mini-scope)

| # | Criterion | Verdict |
|---|---|---|
| 1 | Code-shape preserved (data-only edit; first-band 0.010 untouched; no source changes) | **PASS** |
| 2 | 40w smoke — anchors ≥26/27, benchmarks 6/6 | **PASS** (anchors 26/27, benchmarks 6/6, hash `987cfe1dcdb272f8`; only `op:brcko:brka_2` fail = pre-existing P0 in Phase 1 baseline) |
| 3 | 188w faction-mean — HRHB whole-run Δ/turn ≤0 strict OR post-w52 segment Δ/turn ≤0 refined; RBiH ≥+0.001; RS active ≥35; final_state_hash emits | **PASS via refined** (HRHB +0.000105 strict / **−0.000768 refined**; RBiH +0.003909; RS active 52; hash `bd043ba67dd5257a`) |
| 4 | 188w stayer-Δ — HRHB ≤0 strict OR refined | **PASS via refined** (HRHB whole-run +0.000128; segment-trajectory decisively negative post-t52) |
| 5 | 11/11 lane tests still pass after numerics swap | **PASS** (no test changes required — band-boundary cycling test uses RS numerics; HRHB faction-symmetric test uses sharedCurve `0.005`, not shipped HRHB numerics) |
| 6 | `npx tsc --noEmit` clean | **PASS** |
| 7 | Sensitive-history compliance asserted | **PASS** (Ring 1, BB-citation block carries from mini-panel, no §6 surface; faction-symmetric mechanism with asymmetric data) |
| 8 | Stop triggers respected (5 carried + 6th NEW RS regression) | **PASS** — none fired; RS metrics byte-identical to Phase 1 |
| 9 | Out-of-scope guards (RS shipped numerics byte-identical via git diff; RBiH UNTOUCHED; no source code touched) | **PASS** (git diff confirms only `data/scenarios/timelines/apr1992.json` changed; only HRHB step-curve lines modified) |
| 10 | Phase 1 lane report under `docs/40_reports/implemented/` | **DELIVERED** (this file) |

**Final verdict: SHIP**. RS regression-check holds byte-identical. HRHB whole-run attenuates 79% (Phase 1 +0.000505 → retune +0.000105); post-w52 segment Δ/turn bends decisively negative at −0.000768/turn (PASS refined criterion). Stayer-Δ attenuates 75% (Phase 1 +0.000520 → retune +0.000128). The strict whole-run reading remains slightly positive due to canonical pre-w52 professionalization arc dominance — the Phase 1 PROJECT_LEDGER lesson about pre-w52 contribution holds. Per mini-panel synthesis: "the post-w52 segment Δ/turn ≤ 0 refined criterion is the only realistic ship gate for HRHB without an early-band cool" — refined gate satisfied unambiguously.

## Sensitive-history compliance

- **Ring 1.** No Ring 2 or Ring 3 surface touched.
- **No §6 surface.** Faction-symmetric mechanism (single accessor pathway via `lookupStepCurve`); no special-cased rupture / enclave / Srebrenica / Drina path.
- **Faction-agnostic mechanism with asymmetric data.** Same code path for all factions; data table is data, not logic. Mini-panel BB1/BB2 grounding block carries from `3f8951e1`.
- **No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / `enclave_resilience.ts` touch.**
- **No combat-math number tuned outside the panel-recommended numerics.**
- **Determinism preserved.** Same `lookupStepCurve` invocation; only `value` numbers in array entries differ. IEEE-754 float arithmetic unaffected.

## Files committed (this lane)

- `data/scenarios/timelines/apr1992.json` — 3 numeric values for HRHB band 2/3/4 (0.007→0.0057, 0.003→0.000, -0.002→-0.004); first-band 0.010 untouched; RS subkey untouched; RBiH subkey untouched
- `docs/40_reports/implemented/20260505_HRHB_NUMERICS_RETUNE_PHASE_1.md` (NEW; this file)

No source code, no test, no scenario harness, no canon, no political_controllers, no FORAWWV, no paint anchor, no OOB, no rupture-wiring, no `enclave_resilience.ts` touched.

## Successor handoffs

1. **Pre-w52 canonical arc cooling (DEFERRED P1):** Phase 1 PROJECT_LEDGER lesson holds — HRHB pre-w52 canonical professionalization arc dominates 188-turn whole-run averages. To bend HRHB whole-run strict reading negative, an early-band cool (e.g., `0.008 / 0.005 / 0.000 / -0.004`) would be required, but this drifts 40w hash and crosses Phase 0 panel approved-numerics line. Recommended only if downstream lanes show HRHB officer-quality strict-reading is load-bearing for additional gates.
2. **Promote refined post-w52 segment Δ/turn ≤ 0 criterion to canonical ship gate** for late-war calibration lanes per Phase 1 PROJECT_LEDGER lesson; this lane confirms refined-reading utility on a second data point.
3. **Fix Shape C re-evaluation (DEFERRED → still candidate):** cohort-experience formula replacement remains structurally independent. Two consecutive refined-passes across RS+HRHB reduce urgency; defer to v0.9.5+ unless a load-bearing failure mode emerges.
4. **MORALE_OVERRIDE_ENABLED flag promotion** to default-on (188w gate now FOUR times-validated).

## Determinism

The diagnostics use sorted iteration over canonical faction order `['HRHB', 'RBiH', 'RS']`, numeric-ascending turn iteration, and `strictCompare`. No `Math.random` / `Date.now` / `new Date` / locale-sort / environment-leak. The retune is determinism-safe by construction (object-key access on faction; sequential scan over in-order array via `lookupStepCurve`). RS metrics byte-identical to Phase 1 confirms the determinism-auditor's structural prediction.

## Cross-lane finding update: TWO consecutive partial-bend ships

| Attempt | Lever | Lane | 188w VRS Δ/turn | 188w HRHB Δ/turn (whole-run / post-w52 segment) | Verdict |
|---|---|---|---|---|---|
| 1 | Wave 4 reinforcement_mult | RECONSTITUTION-POLICY-REVIEW | +0.000591 | (positive) | reverted |
| 2 | Lane A OFFICER_CASUALTY_MULT | OCM-PHASE-1-IMPL-REDO | +0.000591 | (positive) | reverted |
| 3 | Phase 1 OQ-Growth FACTION_LEARNING_RATE step-curve | OQ-GROWTH-PHASE-1-IMPL | +0.000780 | (DORMANT) | reverted |
| 4 | Phase 1 B'.2 timeline-data step-curve | OQ-LEARNING-RATE-TIMELINE-DATA-PHASE-1 | **−0.000677** | **+0.000505 / +0.000131** | PARTIAL SHIP |
| **5** | **HRHB numerics retune (THIS LANE)** | **HRHB-NUMERICS-RETUNE-PHASE-1** | **−0.000677** (byte-identical) | **+0.000105 / −0.000768** | **SHIP — refined criterion PASS for HRHB; RS byte-stable** |

Ship #5 is the first lane in the chain to bend BOTH RS and HRHB to refined-criterion PASS while leaving RS metrics byte-identical to its Phase 1 baseline. Mechanism class B'.2 is now twice-validated; numerics-tuning at the data layer is sufficient to converge late-war doctrinal arcs without further code changes.
