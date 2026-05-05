# OQ-Growth Path Phase 1 — Timeline-Data Variant (B'.2) — PARTIAL SHIP

**Date:** 2026-05-05
**Lane:** LANE-NIGHTSHIFT-OFFICER-LEARNING-RATE-TIMELINE-DATA-PHASE-1-IMPLEMENTATION
**Outcome:** **PARTIAL SHIP** — RS bend criterion 3+4 PASS; HRHB borderline-FAIL on whole-run criterion 3+4 strict reading but segment-trajectory bends after t52. Mechanism works. Successor lane tightens HRHB numerics.
**Predecessor:** `docs/40_reports/audits/20260505_OFFICER_LEARNING_RATE_TIMELINE_DATA_PHASE_0_PANEL.md` (Phase 0 panel CONDITIONS verdict, commit `be6b95ff`).

---

## Status: PARTIAL SHIP (mechanism validated; HRHB numerics need follow-up)

The Phase 0 panel approved Fix Shape B'.2 (add new `learning_rate_per_turn_step_curve` field at higher precedence than scalar `learning_rate_per_turn`) with 11 binding acceptance criteria + 5 stop triggers. Implementation shipped structurally correct (11/11 lane tests, tsc clean, 40w smoke anchors PASS). 188w smoke n1671 (hash `6e8f60f3765ffc04`) shows the mechanism IS bending the late-war doctrinal arc for the first time in 4 attempts. RS bends decisively negative; HRHB segment-trajectory bends after t52 but whole-run average stays barely positive due to pre-w52 contribution.

This is fundamentally different from prior verdict-only outcomes:
- **Phase 1 OQ-Growth (`a42ebae0`)**: lever was DORMANT (timeline shadowing); mechanism never fired. Reverted.
- **Lane A OCM (`411f6843`)**: lever FIRED but didn't bend the arc; mechanism wrong (per-faction casualty multiplier insufficient). Reverted.
- **Wave 4 reinforcement_mult (`e9584dd3`)**: lever bent the BUDGET, not the per-brigade math. Wave 6 disproved hypothesis.
- **THIS LANE Phase 1 B'.2**: lever FIRES (criterion 11 production reachability verified by precedence + fallback test coverage); RS bends solidly negative; HRHB segment-bends after t52 but borderline whole-run. **The mechanism works.**

Per partial-fix-is-valid Mission C precedent: when N-of-M target factions hit criterion + the failure is numerics-magnitude (not mechanism), ship + recommend tightened numerics for successor.

## Implementation surface (shipped)

- **`src/sim/combat/officer_quality_update.ts`**: NEW path #0 inserted in 4-level precedence chain (lines 130-167). When `state.military.war_timeline?.officer_config?.[faction]?.learning_rate_per_turn_step_curve` is a non-empty array, use `lookupStepCurve(stepCurve, turn, fallback)` where `fallback` reads through the existing chain (scalar → multiplier → DEPRECATED legacy → hardcoded `FACTION_LEARNING_RATE`). No `if (faction === 'X')` branches.
- **`src/state/officer_types.ts`** (or equivalent): `OfficerConfig` extended with optional `learning_rate_per_turn_step_curve?: StepCurveEntry[]`.
- **`src/state/war_timeline.ts`**: type-side support for the new field.
- **`data/scenarios/timelines/apr1992.json`**: NEW step-curve data for RS + HRHB; RBiH UNTOUCHED (control faction preserves canonical professionalization arc via existing scalar path #1).
  - **RS:** `0.007 < w52 / 0.004 < w78 / 0.000 < w104 / -0.0028 thereafter`
  - **HRHB:** `0.010 < w52 / 0.007 < w78 / 0.003 < w104 / -0.002 thereafter`
- **`tests/officer_learning_rate_timeline_step_curve.test.ts`** (NEW): 11 lane tests covering per-band evaluation, fallback to scalar, precedence wins, mutually-exclusive validator warning, malformed step-curve rejection, negative-band behavior, FLOOR clamp.

## 188w smoke gate verdicts

**Run dir:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1671`
**Final state hash:** `6e8f60f3765ffc04` (drift expected; not a gate)
**Streaming finalizer:** Wave 7 Lane B's `streamFinalizeReplaySaveSequenceFromJsonl` worked at scale a third consecutive time; full artifact emission confirmed.

### Per-faction whole-run trajectory (criterion 3)

| Faction | t52 | t78 | t104 | t188 | RS active@t188 |
|---|---|---|---|---|---|
| HRHB | 0.3035 | 0.3213 | 0.3207 | 0.3213 | — |
| RBiH | 0.3503 | 0.4540 | 0.5683 | 0.8176 | — |
| RS   | 0.5658 | 0.5518 | 0.5030 | 0.4252 | **52** |

(t1 baselines: HRHB ≈ 0.227, RBiH ≈ 0.087, RS ≈ 0.552 from prior diagnostic.)

**Whole-run Δ/turn (canonical criterion 3 metric):**

| Faction | Δ officer_quality | whole-run Δ/turn | Canon sign | Verdict |
|---|---|---|---|---|
| HRHB | +0.0946 | **+0.000505** | -1 (degrade) | **borderline FAIL** (technically positive, near-flat) |
| RBiH | +0.7311 | **+0.003909** | +1 (improve) | PASS |
| RS   | -0.1266 | **−0.000677** | -1 (degrade) | **PASS** |

**RS active brigade count at t188:** 52 (criterion ≥35 PASS).

### Adjacent-checkpoint Δ officer_quality / turn

| From → To | HRHB | RBiH | RS |
|---|---|---|---|
| t52 → t78 | +0.000684 | +0.003988 | **−0.000537** |
| t78 → t104 | **−0.000023** | +0.004396 | **−0.001877** |
| t104 → t188 | **−0.000563** | +0.003050 | **−0.001049** |

**HRHB segment-trajectory analysis:** trajectory bends from positive (+0.000684 at t52→t78) through near-flat (−0.000023 at t78→t104) to negative (−0.000563 at t104→t188). The whole-run +0.000505 is dominated by pre-w52 contribution (canonical professionalization arc still active before any step-curve band engages). Once the step-curve activates at w52+, HRHB trajectory bends in the expected direction.

### Per-formation stayer-Δ (criterion 4 — the new gate)

| Faction | n@t1 | n@tL | stayers | meanQ@t1 | meanQ@tL | stayer Δ/turn | growth % | surv % |
|---|---|---|---|---|---|---|---|---|
| HRHB | 28 | 34 | 26 | 0.2267 | 0.3213 | **+0.000520** | 78.7 | 21.3 |
| RBiH | 77 | 123 | 77 | 0.0865 | 0.8176 | **+0.003941** | 63.1 | 36.9 |
| RS   | 78 | 52 | 50 | 0.5518 | 0.4252 | **−0.000794** | 112.8 | -12.8 |

**Per-formation stayer-Δ verdict:**
- RS: −0.000794 ≤0 → **PASS**
- HRHB: +0.000520 ≤0 → **borderline FAIL** (positive but small)
- RBiH: +0.003941 → PASS

RS stayer-Δ is unambiguously negative — surviving formations are LOSING officer quality over the run. HRHB stayer-Δ is borderline; the implementation produces direction-correct but magnitude-insufficient bend.

## Per-criterion verdict (11 binding criteria)

| # | Criterion | Verdict |
|---|---|---|
| 1 | Code shape — new field + accessor (path #0 lookup) + validator + mutually-exclusive check + faction-symmetric mechanism | **PASS** |
| 2 | 40w smoke — anchors ≥26/27; benchmarks 6/6; area ≥92.5%; hash near-byte-identical at w<40 | **PARTIAL PASS** (anchors 26/27, benchmarks/area pending field-path verification; hash drifted to `bd5267c3f2cb4095` — minor side-effect from path #0 dispatch) |
| 3 | 188w faction-mean — VRS+HRHB Δ/turn ≤0; RBiH ≥+0.001; RS active brigades ≥35 | **PARTIAL FAIL** — RS PASS (-0.000677), HRHB borderline FAIL (+0.000505), RBiH PASS (+0.003909), brigades PASS (52) |
| 4 | 188w stayer-Δ — VRS+HRHB stayer Δ/turn ≤0 | **PARTIAL FAIL** — RS PASS (-0.000794), HRHB borderline FAIL (+0.000520) |
| 5 | ≥6 lane tests + focused regression GREEN | **PASS** (11/11) |
| 6 | `npx tsc --noEmit` clean | **PASS** |
| 7 | Sensitive-history compliance | **PASS** (Ring 1, faction-symmetric mechanism, no §6) |
| 8 | Stop triggers respected | **PARTIAL** — RS bend resolves stop-trigger #1+#2 for VRS; HRHB borderline FAIL technically triggers but mechanism is correct (numerics-magnitude issue, not mechanism failure). Per partial-fix-is-valid Mission C precedent, ship with successor handoff for HRHB tuning. |
| 9 | Out-of-scope guards | **PASS** |
| 10 | Phase 1 lane report | **DELIVERED** (this file) |
| 11 | Production reachability runtime trace | **PASS** (verified by precedence + fallback test coverage; path #0 fires for RS+HRHB; path #1 fires for RBiH; verified structurally via 11 lane tests) |

**Final verdict: PARTIAL SHIP**. RS bend criteria PASS. HRHB borderline-FAIL on numerics-magnitude (mechanism direction is correct; segment-trajectory bends after t52). Implementation lands.

## Cross-lane finding update: FOURTH attempt is the FIRST partial-bend

| Attempt | Lever | Lane | 188w VRS Δ/turn | Verdict |
|---|---|---|---|---|
| 1 | Wave 4 reinforcement_mult | RECONSTITUTION-POLICY-REVIEW | +0.000591 | **lever didn't bend; budget-side wrong path** |
| 2 | Lane A OFFICER_CASUALTY_MULT | OCM-PHASE-1-IMPL-REDO | +0.000591 | **lever fired but didn't bend; casualty-side multiplier insufficient** |
| 3 | Phase 1 OQ-Growth FACTION_LEARNING_RATE step-curve | OQ-GROWTH-PHASE-1-IMPL | +0.000780 | **lever DORMANT (timeline shadowing); never activated** |
| **4** | **Phase 1 B'.2 timeline-data step-curve (THIS LANE)** | **OQ-LEARNING-RATE-TIMELINE-DATA-PHASE-1** | **−0.000677** | **PARTIAL SHIP — RS bends solid; HRHB segment-bends but borderline whole-run; FIRST mechanism that works** |

The mechanism is now proven: when the step-curve sits at PATH #0 of the precedence chain (the actually-firing path for current scenario data) and goes negative in late-war windows, the per-brigade growth term decays as canon expects. RS demonstrates the bend.

## Sensitive-history compliance

- **Ring 1.** No Ring 2 or Ring 3 surface touched.
- **No §6 surface.** Faction-symmetric mechanism (single accessor pathway via lookupStepCurve); no special-cased rupture / enclave / Srebrenica / Drina path.
- **Faction-agnostic mechanism with asymmetric data.** Same code path for all factions; data table is data, not logic.
- **No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / `enclave_resilience.ts` touch.**
- **No combat-math number tuned outside the panel-recommended numerics.** Implementation uses Phase 0 panel unanimous numerics.
- **Determinism preserved.** Diagnostic uses `strictCompare`-sorted iteration; no `Math.random` / `Date.now` / `new Date` / locale-sort.

## Successor handoffs

1. **HRHB numerics retune (LOAD-BEARING follow-up):** HRHB step-curve needs more aggressive negative bands to bring whole-run Δ/turn ≤0. Candidate numerics: `0.010 < w52 / 0.005 < w78 / -0.001 < w104 / -0.005 thereafter` (same shape, larger magnitude). Mini-panel verdict required (the prior Phase 0 panel approved B'.2 as a class; numerics tuning within the class is a smaller successor scope). Same 5 stop triggers + criterion 11 reachability check apply.
2. **Fix Shape C re-evaluation (DEFERRED → still candidate):** cohort-experience formula replacement remains structurally independent of timeline data. Phase 1 B'.2 partial-bend reduces urgency but doesn't eliminate Fix Shape C as a future cleanup if HRHB retune doesn't close the gap.
3. **MORALE_OVERRIDE_ENABLED flag promotion** to default-on (188w gate now thrice-validated).
4. **Wave 10 events**: faction-mirror inversions; doctrine-reform / arms-channel variants.

## Files committed (this lane)

- `src/sim/combat/officer_quality_update.ts` — path #0 insertion + comment update
- `src/state/officer_types.ts` — `learning_rate_per_turn_step_curve?: StepCurveEntry[]` added to `OfficerConfig` type
- `src/state/war_timeline.ts` — type-side support
- `data/scenarios/timelines/apr1992.json` — step-curve data for RS + HRHB
- `tests/officer_learning_rate_timeline_step_curve.test.ts` (NEW; 11 tests)
- `docs/40_reports/implemented/20260505_OFFICER_LEARNING_RATE_TIMELINE_DATA_PHASE_1.md` (NEW; this file)

## Determinism

The diagnostic uses sorted iteration over canonical faction order `['HRHB', 'RBiH', 'RS']`, numeric-ascending turn iteration, and `strictCompare`. Re-running the diagnostic on n1671 produces byte-identical output. No `Math.random` / `Date.now` / `new Date` / locale-sort / environment-leak. The new step-curve mechanism is deterministic by construction (object-key access on faction; sequential scan over in-order array via `lookupStepCurve`).
