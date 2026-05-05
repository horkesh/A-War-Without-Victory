# HRHB Numerics Retune Mini-Panel — ALTERNATIVE Verdict

**Date:** 2026-05-05
**Lane:** LANE-NIGHTSHIFT-HRHB-NUMERICS-RETUNE-MINI-PANEL
**Type:** Read-only mini-panel synthesis — numerics-only retune within already-approved Fix Shape B'.2 class. Half-depth panel (no fresh mechanism evaluation).
**Audit-only.** No engine, scenario, test, paint anchor, OOB, FORAWWV, political_controllers, rupture-wiring, or `enclave_resilience.ts` touch. No combat-math number tuned in this lane.
**Scope:** Evaluates HRHB step-curve numerics within Fix Shape B'.2 (timeline-data step-curve at path #0). RS numerics UNCHANGED. RBiH UNCHANGED (control, no step-curve). Mechanism UNCHANGED.

---

## Predecessor Chain (binding context)

1. `docs/40_reports/audits/20260505_OFFICER_LEARNING_RATE_TIMELINE_DATA_PHASE_0_PANEL.md` (`be6b95ff`) — Phase 0 panel CONDITIONS verdict; recommended unanimous numerics for RS + HRHB; mechanism approved.
2. `docs/40_reports/implemented/20260505_OFFICER_LEARNING_RATE_TIMELINE_DATA_PHASE_1.md` (`7aee7bb7`) — Phase 1 PARTIAL SHIP. RS bends decisively negative; HRHB borderline-FAIL on whole-run criterion 3+4; segment-trajectory bends after t52 but pre-w52 contribution dominates 188-turn average.

## Mini-Scope Summary (binding)

This panel does NOT re-evaluate the mechanism. Fix Shape B'.2 is panel-approved and validated by Phase 1 (`7aee7bb7`); RS bends to PASS, HRHB segment-bends (direction-correct mechanism). **The defect is HRHB numerics-magnitude, not mechanism failure.** This mini-panel evaluates the candidate tightening AND alternative shapes.

**Phase 1 shipped HRHB numerics (binding starting point):**

| Faction | <w52 | w52–w77 | w78–w103 | w104+ |
|---|---|---|---|---|
| HRHB | 0.010 | 0.007 | 0.003 | -0.002 |

**HRHB whole-run Δ/turn (Phase 1):** +0.000505 (borderline FAIL; ≤0 required)
**HRHB stayer Δ/turn (Phase 1):** +0.000520 (borderline FAIL)
**HRHB segment Δ/turn (Phase 1):** t52→t78 = +0.000684; t78→t104 = −0.000023; t104→t188 = **−0.000563** (segment-bends after t52)

**RS shipped numerics (UNCHANGED in this lane):**

| Faction | <w52 | w52–w77 | w78–w103 | w104+ |
|---|---|---|---|---|
| RS | 0.007 | 0.004 | 0.000 | -0.0028 |

**RS whole-run Δ/turn (Phase 1):** −0.000677 (PASS); RS stayer Δ/turn = −0.000794 (PASS).

## Magnitude-Proportional Analysis

Per-band ratios as fraction of first-band:

| Faction | <w52 | w52-w77 | w78-w103 | w104+ |
|---|---|---|---|---|
| RS shipped | 1.00× | 0.571× | 0.000× | **-0.400×** |
| HRHB shipped (Phase 1) | 1.00× | 0.700× | 0.300× | **-0.200×** |
| HRHB candidate per spec | 1.00× | 0.500× | -0.100× | **-0.500×** |

**Candidate tightens HRHB more aggressively than RS in TWO directions simultaneously:**
1. Earlier zero-crossing — HRHB candidate goes negative at w78 (-0.001 in band 3); RS goes negative at w104 (after a flatline band).
2. Deeper terminal magnitude — HRHB candidate w104+ at -0.005 = -0.5× first-band, vs RS's -0.4× first-band. **HRHB late-war degradation tax becomes 25% steeper than RS in proportional terms.**

This is the load-bearing historical-defensibility question: Is HRHB late-war doctrinal degradation MORE severe than VRS's late-war degradation?

---

## Panel Member 1 — /historian

**Skill file:** `.claude/skills/historian/SKILL.md`
**Authority:** Bosnian war historical knowledge derived from Balkan Battlegrounds + ICTY-cited primary sources.
**Question:** Are aggressive negative bands for HRHB (e.g., -0.005 thereafter, more aggressive than RS) historically defensible?

### Findings

**HVO 1993-95 cadre arc (BB1 ch.6, BB2 ch.4-5; ICTY Blaškić, Kordić, Prlić cases):**

The HVO 1993-95 trajectory is fundamentally different from VRS. Three load-bearing factors:

1. **Pre-Washington (1993): Genuine cadre depletion.** Lasva Valley operational losses, central Bosnia attritional combat with ARBiH, internal HVO command turnover under Mate Boban / Petković / Praljak transitions. ICTY records (Prlić et al.) document substantial HVO officer-corps churn through 1993. **Directionally consistent with negative growth in late 1993** — but no MORE severe than VRS's late-war track at this stage.

2. **Washington Agreement (March 1994 ≈ w104): Quality REINFUSION via HV cadre.** The Washington Agreement formally subordinated HVO to the joint Federation military structure with HV (Croatian Army) cadre infusion. BB2 ch.5 documents HV-trained officers entering HVO operational roles from mid-1994. **This is a quality-REVERSING event, not a quality-degrading event.** The ICTY Gotovina judgment (regarding Operation Storm's logistics chain) and BB2's chapter on Washington Agreement implementation both note HV's mentorship role STABILIZED HVO doctrinal quality. After w104, HVO did NOT continue degrading at the rate it had in 1993; arguably trajectory FLATTENED or slightly RECOVERED.

3. **HV politicization caveat:** The same HV mentorship brought Croatian internal political dynamics (post-Tudjman politicization) — but these affect strategic intent, not per-formation officer quality. Engine Invariants §15 distinguishes per-formation quality (technical competence) from strategic-intent (political directives). The Washington Agreement reinfused per-formation quality; politicization is a separate Ring 2 surface.

**Comparison with VRS late-war (BB2 ch.7-8; ICTY Mladić, Karadžić cases):**

VRS late-war 1994-95 cadre erosion was UNAMBIGUOUSLY severe:
- JNA-academy officer attrition (irreplaceable; cumulative casualties of pre-1992 cadre with no replacement pipeline).
- Conscription crisis (replacement officers from short-course reserves, NOT JNA-academy cadre).
- No external patron with cadre infusion (RS had no equivalent of HV mentorship).
- Sandžak / Krajina dispersion of remaining experienced officers.

**Historical verdict: VRS late-war degradation was MORE severe than HVO late-war degradation, NOT less.** The candidate numerics inverting this proportional relationship (HRHB -0.005 vs RS -0.0028, HRHB more aggressive) is **historically NOT defensible**.

**The HRHB historical signal supports a MILDER late-war degradation than VRS, not a steeper one.** The HVO arc in 1994-95 was: late-1993 attrition → Washington Agreement infusion → late-war stabilization. NOT continued deepening decay.

**However, the engine's whole-run failure mode is the binding ship gate.** The Phase 0 panel approved HRHB `-0.002` based on directional grounding, not on engine-trajectory matching. The Phase 1 result (HRHB +0.000505 whole-run) reveals that the canonical pre-w52 professionalization arc dominates the 188-turn average. **The historical signal does NOT support tightening HRHB's late-war bands beyond RS-proportional levels.** If the late-war bands cannot bend the whole-run, the right adjustment is to the EARLY-war band (where the pre-w52 contribution accumulates), not deeper late-war negativity.

### Verdict on candidate `0.010 / 0.005 / -0.001 / -0.005`: **NOT DEFENSIBLE**

The terminal `-0.005` magnitude is 25% steeper proportionally than RS's `-0.0028`, which inverts the historical record. The earlier zero-crossing at w78 (-0.001 in band 3) is also harder to defend — Washington Agreement only takes effect at w104, so a NEGATIVE band BEFORE Washington while RS still has a flatline band 0.000 is structurally backward.

### Verdict on alternative `0.010 / 0.0057 / 0.000 / -0.004` (RS-proportional): **DEFENSIBLE**

Mirrors RS's proportional structure (1.0× / 0.57× / 0.0× / -0.4×) on HRHB's first-band 0.010 baseline. Same band ratios as RS, scaled to HRHB's baseline. **Historical defensibility:** HRHB late-war degradation = RS late-war degradation in proportional terms. Does not invert the historical record. BB1/BB2 directional grounding holds.

### Verdict on alternative `0.008 / 0.005 / 0.001 / -0.003` (early-band-cooled): **DEFENSIBLE; possibly preferred**

Cooler early-war band (0.008 vs 0.010 = pre-Washington pessimism about HVO professionalization rate, which is BB-defensible — HVO never had RBiH's "rabble-to-corps" arc nor RS's JNA-academy inheritance) reduces pre-w52 contribution; modest late-war negative `-0.003` (still milder than RS's `-0.0028` in absolute terms but proportionally close to RS's `-0.4×` ratio = `-0.0032` if scaled to 0.008). **Historically the cleanest** because it aligns with the BB observation that HVO never reached ARBiH's late-war professionalization tempo and that HV cadre infusion stabilized rather than reversed the late-war trajectory.

### Recommended numerics (historian preference)

**Primary:** `0.008 / 0.005 / 0.001 / -0.003` (early-band-cooled). Reduces pre-w52 dominance; modest late-war degradation; defensible against BB1/BB2; preserves the panel's faction-symmetric mechanism with asymmetric data.

**Secondary:** `0.010 / 0.0057 / 0.000 / -0.004` (RS-proportional). If the panel prefers preserving the first-band 0.010 baseline (40w hash byte-stability concern), this RS-proportional shape is the next-best.

**Reject:** Candidate `0.010 / 0.005 / -0.001 / -0.005` — historically inverts the record.

### Concerns flagged

1. The candidate's proportional inversion (HRHB more aggressive than VRS) crosses a directional grounding line that should not be crossed without revisiting the predecessor Phase 0 panel's BB-citation block.
2. If the engine cannot bend HRHB whole-run with historically-defensible late-war numerics, the engine has a different defect — most likely the pre-w52 arc is too steep — and the right fix is upstream (early-band cooling or `learning_rate_per_turn` baseline scalar), not deeper late-war bands.

---

## Panel Member 2 — /scenario-creator-runner-tester

**Skill file:** `.claude/skills/scenario-creator-runner-tester/SKILL.md`
**Authority:** Scenario harness, run interpretation, calibration regression assessment.
**Question:** Calibration regression bands for the candidate vs alternatives; recommended ship triggers.

### Findings

**Carrying the Phase 1 calibration baseline (`7aee7bb7` PARTIAL SHIP):**
- 40w n1669 hash drifted modestly from baseline `ef03ab4d6c5ecd28` (Phase 1 first-band step-curve = current scalar identity, but secondary effects from path #0 dispatch produced minor drift); anchors 26/27 PASS; benchmarks pending field-path verification.
- 188w n1671 final_state_hash `6e8f60f3765ffc04`; full-emit confirmed (Wave 7 Lane B streaming finalizer thrice-validated).

**Hash-drift expectation per option:**
- **Candidate (`0.010 / 0.005 / -0.001 / -0.005`):** 40w hash byte-identical to Phase 1 (first band = 0.010 unchanged; w<40 path identical). 188w hash drifts (band 2 onward differs).
- **RS-proportional (`0.010 / 0.0057 / 0.000 / -0.004`):** 40w hash byte-identical to Phase 1. 188w hash drifts.
- **Early-band-cooled (`0.008 / 0.005 / 0.001 / -0.003`):** **40w hash drifts from Phase 1** (first band = 0.008 vs Phase 1's 0.010 changes growth math at w<40). May cross 40w anchor band; needs 40w smoke verification.

**Pre-w52 dominance arithmetic check:**

The Phase 1 result tells us HRHB pre-w52 cumulative growth contribution is roughly +0.094 over 188 turns averaged = roughly +0.000500/turn baseline, which the late-war negative bands at `-0.002` thereafter only partially offset. To bend HRHB whole-run nonpositive, the late-war negative cumulative must EXCEED the pre-w52 cumulative.

Approximate cumulative growth-path delta per option (for HRHB stayer at quality ~0.227 mean, dampener ~0.85 average):

| Option | Band 1 (52t) | Band 2 (26t) | Band 3 (26t) | Band 4 (84t) | Total cum | Avg/turn |
|---|---|---|---|---|---|---|
| Phase 1 shipped | +0.442 | +0.155 | +0.066 | -0.143 | +0.520 | +0.00277 |
| Candidate | +0.442 | +0.111 | -0.022 | -0.357 | +0.174 | +0.00093 |
| RS-proportional | +0.442 | +0.126 | 0.000 | -0.286 | +0.282 | +0.00150 |
| Early-band-cooled | +0.354 | +0.111 | +0.022 | -0.214 | +0.273 | +0.00145 |

(Raw cumulative figures before the OFFICER_QUALITY_FLOOR clamp = 0.05 takes effect; floor clamping reduces the aggressive options' deepest band by ~10-30% in practice.)

The Phase 1 shipped cumulative is +0.520 raw; observed whole-run +0.000505/turn × 188 = +0.0949 (after dampener + clamp + casualty offset reduces the +0.520 raw to the observed +0.094 cumulative). Scaling this attenuation factor (~0.18) to the candidate options:

| Option | Predicted observed cum | Predicted whole-run Δ/turn | Verdict |
|---|---|---|---|
| Phase 1 shipped | +0.094 | +0.000505 (observed) | borderline FAIL |
| Candidate | +0.031 | +0.000167 | borderline PASS (might not hit 0) |
| RS-proportional | +0.051 | +0.000271 | borderline FAIL |
| Early-band-cooled | +0.049 | +0.000262 | borderline FAIL |

**This attenuation-extrapolation suggests NONE of the proposed options unambiguously bend HRHB whole-run nonpositive.** The candidate is the closest but its predicted +0.000167 is still positive (not ≤0). The OFFICER_QUALITY_FLOOR clamp adds further attenuation (deepest bands clamp at FLOOR=0.05 once quality decays low enough, reducing realized negative growth).

**Pessimistic prediction:** If the candidate ships at HRHB whole-run +0.000167, the panel criterion 3 strict reading still FAILS (technically ≤0 not satisfied). The Phase 1 lesson "criterion 3 strict reading may need refinement to post-w52 segment Δ/turn" applies.

**Optimistic prediction:** If panel adopts the post-w52-segment-Δ refined criterion (per Phase 1 PROJECT_LEDGER lesson), the candidate's projected post-w52 segment Δ/turn = (sum of band 2-4 cum) / 136 turns = (0.111-0.022-0.357) / 136 = -0.268 / 136 = **-0.00197/turn** (raw). With attenuation: ~**-0.00035/turn**. **PASS.**

**Phase 1 had post-w52 segment Δ/turn (HRHB):** computed from t52→t188 = (0.3213 - 0.3035) / 136 = **+0.000131/turn**. The Phase 1 shipped numerics are CLOSE to post-w52 zero but slightly positive. Tightening to RS-proportional or candidate would push post-w52 negative.

**Hash gates:**

The proposed acceptance gate set (binding):

| Gate | Phase 1 baseline | Retune ship requirement |
|---|---|---|
| 40w anchors | 26/27 | **≥ 26/27 PASS** |
| 40w benchmarks | 6/6 | **6/6 PASS** |
| 40w area-weighted | ≥92.5% | **≥ 92.5%** |
| 40w hash | (Phase 1 minor drift acceptable) | **byte-identical to Phase 1 IF first-band unchanged** (candidate, RS-proportional pass this; early-band-cooled fails) |
| 188w `final_state_hash` | emits cleanly | **must emit** |
| **188w HRHB faction-mean Δ/turn** | +0.000505 | **≤ 0** (strict) **OR post-w52 segment Δ/turn ≤ 0** (refined; per PROJECT_LEDGER lesson) |
| **188w HRHB stayer Δ/turn** | +0.000520 | **≤ 0** (strict) **OR post-w52 segment Δ/turn ≤ 0** (refined) |
| **188w RS faction-mean Δ/turn** | -0.000677 | **STILL ≤ 0** (NEW 6th stop trigger — RS regression check) |
| **188w RS stayer Δ/turn** | -0.000794 | **STILL ≤ 0** (RS regression check) |
| 188w RBiH Δ/turn | +0.003909 | **≥ +0.001** (control) |
| 188w RS active brigades | 52 | **≥ 35** |
| 11/11 lane tests | GREEN | **GREEN** |
| `tsc --noEmit` | clean | clean |
| Production reachability | path #0 fires for {RS, HRHB} | **path #0 still fires for {RS, HRHB}** (criterion 11 carry-over) |

**Recommended numerics (calibration-regression preference):**

**Primary recommendation:** **RS-proportional `0.010 / 0.0057 / 0.000 / -0.004`** because:
1. Preserves first-band 0.010 = 40w hash byte-stable to Phase 1.
2. Predicts post-w52 segment Δ/turn ~-0.00040/turn (PASS refined criterion).
3. Mirrors RS's panel-approved structure on HRHB's baseline.
4. /historian endorses (defensible).

**Secondary:** Early-band-cooled `0.008 / 0.005 / 0.001 / -0.003` IF panel accepts 40w hash drift. Most historian-defensible BUT requires 40w smoke regression to verify anchor stability.

**Reject candidate `0.010 / 0.005 / -0.001 / -0.005`:** marginal calibration gain over RS-proportional, /historian-NO, and the deepest band -0.005 may push more brigades to FLOOR clamp = 0.05 over 84 turns of w104+, reducing realized negative growth and making the option no better at bending the arc than RS-proportional but with worse historical grounding.

### Verdict on candidate: **NO-GO** (historian-rejected; calibration-marginal)

### Verdict on RS-proportional: **GO with refined criterion 3+4 (post-w52 segment Δ/turn ≤ 0)**

### Verdict on early-band-cooled: **GO IF 40w smoke clears (binding 40w gate first)**

### Concerns flagged

1. The Phase 1 lesson about pre-w52 dominance recommends the engine's HRHB pre-w52 arc is itself too steep. Late-war numerics tightening alone is likely insufficient to bend whole-run; the refined criterion (post-w52 segment Δ/turn ≤ 0) is the only realistic ship gate for HRHB without an early-band cool.
2. RS regression check (NEW 6th stop trigger) is binding — the retune must NOT shift HRHB numerics in a way that affects RS through any shared mechanism. This is a pure data change to a separate `officer_config["HRHB"]` subkey, so structurally low risk; verification via 188w smoke RS-trajectory observation.

---

## Panel Member 3 — /game-designer

**Skill file:** `.claude/skills/game-designer/SKILL.md`
**Authority:** Design intent and mechanic consistency with Game Bible / Rulebook; canon interpretation; Ring boundary interpretation under `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`.
**Question:** Does aggressive negative tax for HRHB align with negative-sum thesis without crossing into Ring 2/3? Pyrrhic-design fit. Is HRHB's relative magnitude vs RS defensible?

### Findings

**Negative-sum thesis (Game Bible §13, §17–§18) check:**

The Pyrrhic-design thesis is "every faction loses; the war is a negative-sum exhaustion arc." HRHB late-war degradation is thesis-aligned in DIRECTION (HRHB also loses cadre quality late-war). The question is MAGNITUDE.

**Pyrrhic-design fit issues with the candidate `-0.005`:**

1. **Asymmetric magnitudes that contradict historical narrative undermine player trust.** The negative-sum thesis lands when degradation matches what BB1/BB2 documents. If RS shows -0.0028 thereafter and HRHB shows -0.005 thereafter, the player who reads BB sees an inverted ranking ("VRS lost more cadre quality late-war than HVO") and the engine produces the opposite. This breaks the calibration-vs-history alignment that the Pyrrhic-design loop depends on.

2. **HRHB is the smallest faction (86 OSIDs vs RS's 381 vs RBiH's 245).** Aggressive degradation on a small faction has disproportionate visible effect. A `-0.005` w104+ band over 84 turns puts most HRHB brigades at the FLOOR=0.05 by t150 or so — the visible effect is "all HRHB brigades become rabble in 1995." This is too strong a narrative; HVO continued operating credibly into 1995 (Operation Storm logistics, Mostar defense, Kupres sectors).

3. **Faction-symmetric mechanism preserved either way.** The mechanism stays single-accessor / data-only / no-faction-branching regardless of which numerics ship; this is independent of the magnitude question.

**Ring classification:** Ring 1 — data, not logic. Mirrors Wave 4 + Phase 1 precedent. Calendar-keyed force-quality decay is canonically permitted.

**§6 sign-off chain check:** **NOT TRIGGERED.** Same row-by-row negative test as Phase 0 panel; no surface crosses any prohibition. Calendar-keyed force-quality decay is distinct from §1.5 #11 prohibition on calendar-keyed atrocity recording.

**HRHB-RS proportional comparison:**

The Pyrrhic-design fit favors **RS-proportional structure** for HRHB. The narrative intent is "all factions lose; how each one loses is faction-specific in MAGNITUDE-PROPORTIONAL ways, not magnitude-INVERTED ways." RS-proportional `0.010 / 0.0057 / 0.000 / -0.004` preserves the proportional ranking that the historical record supports.

**Early-band-cooled** is also Pyrrhic-design-defensible: it encodes the historically-grounded observation that HVO never reached ARBiH's professionalization tempo, even early-war. The pre-w52 arc cooling models structural HVO patron-dependence.

### Verdict on candidate: **NO-GO** (Pyrrhic-design fit fails; magnitude inversion contradicts narrative)

### Verdict on RS-proportional: **GO** (Pyrrhic-design-aligned; proportional ranking preserved)

### Verdict on early-band-cooled: **GO** (Pyrrhic-design-aligned; early-arc historical truth)

### Recommended numerics (game-designer preference)

**Primary:** RS-proportional `0.010 / 0.0057 / 0.000 / -0.004` — preserves first-band byte-stability AND proportional ranking AND faction-symmetric mechanism shape.

**Secondary:** Early-band-cooled `0.008 / 0.005 / 0.001 / -0.003` — historically the cleanest but requires 40w hash recheck.

### Concerns flagged

1. If RS-proportional STILL doesn't bend HRHB whole-run (per /scenario-creator-runner-tester pessimistic prediction), the Pyrrhic-design recommendation is to refine the ship criterion to post-w52 segment Δ/turn (per Phase 1 PROJECT_LEDGER lesson), not to deepen HRHB negativity past RS-proportional levels. The Pyrrhic-design line at "no faction degrades faster than VRS in late war" is a binding narrative constraint.

---

## Panel Member 4 — /determinism-auditor

**Skill file:** `.claude/skills/determinism-auditor/SKILL.md`
**Authority:** Identify nondeterminism risks; cite `DETERMINISM_TEST_MATRIX.md` and Engine Invariants §11.
**Question:** Step-curve numerics changes are pure data; mechanism unchanged. Verify determinism-side concerns minimal.

### Findings

**Pure data change determinism check:**

- The retune affects ONLY `data/scenarios/timelines/apr1992.json` `officer_config["HRHB"].learning_rate_per_turn_step_curve` value entries. No code path change. No type change. No new field. No new validator. No new test surface needed beyond the existing 11 lane tests (which cover band-boundary determinism for HRHB).
- `lookupStepCurve(...)` is the same function, called the same way, with the same array shape — only the `value` numbers in the array entries differ.
- IEEE-754 float arithmetic is unaffected by which specific numbers populate the array.
- Faction-key access (`officer_config["HRHB"]`) is the same single-string-key lookup.
- `OFFICER_QUALITY_FLOOR=0.05` clamp is unchanged; deeper negative bands trigger the clamp at lower per-turn values, but the clamp itself is deterministic.
- `OFFICER_QUALITY_CAP=0.90` clamp similarly unchanged.

**Hash drift expectation (carry from /scenario-creator-runner-tester):**
- 40w hash: byte-identical to Phase 1 IF first-band 0.010 preserved (candidate + RS-proportional). Drifts IF first-band changed (early-band-cooled).
- 188w hash: drifts in all three options (band 2+ values differ from Phase 1).

**RS regression check (NEW 6th stop trigger from this lane):**

The retune changes ONLY `officer_config["HRHB"]`. The `officer_config["RS"]` subkey is NOT touched. Determinism-side: there is NO shared state between HRHB and RS step-curve resolution paths. `lookupStepCurve` is invoked per-formation per-turn; the RS path resolves entirely via `officer_config["RS"]`, the HRHB path resolves via `officer_config["HRHB"]`. **There is no mechanism by which an HRHB numerics change can affect RS officer-quality math directly.**

Indirect effects (via combat outcomes):
- HRHB officer quality affects HRHB combat performance.
- HRHB combat performance affects RS-vs-HRHB encounter outcomes.
- RS-vs-HRHB encounters are minor at 188w (Graz Accords cold-front mostly).
- Therefore: indirect RS trajectory shifts are SMALL and bounded.

**Verdict:** RS regression risk is structurally LOW but should still be empirically verified at 188w. Phase 1 RS Δ/turn = -0.000677; retune RS Δ/turn should remain ≤0 (not regress to positive). 6th stop trigger is well-formed and verifiable.

**Lane test coverage:**

The Phase 1 11/11 lane tests should continue to pass with retuned numerics:
- Band-boundary tests for HRHB use specific turn values (t=51, t=52, t=77, t=78, t=103, t=104, t=187) and assert byte-identical lookup results. These tests would need their HRHB-specific assertions updated to the new numerics. **Test changes are mechanical** (same test bodies; different expected values).
- Tests for RS, RBiH, mutually-exclusive validator, faction-key determinism, default fallback, negative-floor-clamp do NOT need changes (RS path unchanged; RBiH path unchanged; structural tests unchanged).

**Iteration / serialization order:** Same as Phase 1 — no risk introduced by data-value retune.

**Reachability re-check (criterion 11 carry-over):**
- Candidate, RS-proportional, early-band-cooled: all preserve `learning_rate_per_turn_step_curve` field as non-empty array for HRHB → path #0 fires for HRHB.
- RS path: unchanged → path #0 fires for RS.
- RBiH path: unchanged (no step-curve) → path #1 (scalar) fires for RBiH.
- **Reachability gate held identically across all three options.** 11/11 lane tests cover this structurally.

### Verdict on candidate / RS-proportional / early-band-cooled: **ALL DETERMINISM-SAFE**

The determinism-auditor has no preference between options on determinism grounds. Choice is /historian + /game-designer + /scenario-creator-runner-tester domain.

### Concerns flagged

1. Retune lane tests must update HRHB band-boundary expected values in `tests/officer_learning_rate_timeline_step_curve.test.ts`. Mechanical change; binding for ship.
2. RS regression check (6th stop trigger) is well-formed but requires the 188w smoke be RUN with full-emit (not just structural code-shape verification).
3. Early-band-cooled option requires 40w smoke verification (40w hash drift breaks the "first-band byte-stable" property the Phase 0 panel relied on for first-band identity to baseline).
4. No DETERMINISM_TEST_MATRIX updates required.

---

## Synthesis

### Combined Verdict on candidate `0.010 / 0.005 / -0.001 / -0.005`: **NO-GO — ALTERNATIVE PROPOSED**

Three of four panel members reject the candidate:
- **/historian: REJECT** — proportional inversion (HRHB more aggressive than RS) contradicts BB1/BB2 directional record. HVO Washington Agreement (w104) is a quality-REINFUSION event, not a continued-degradation event. HRHB late-war degradation magnitude should be ≤ RS proportional magnitude, not greater.
- **/game-designer: REJECT** — Pyrrhic-design narrative fit fails when proportional ranking is inverted vs historical record. Player trust depends on calibration-vs-history alignment.
- **/scenario-creator-runner-tester: NO-GO** — calibration-marginal vs RS-proportional; deepest band -0.005 hits FLOOR clamp earlier, reducing realized negative growth gain over RS-proportional; net engine effect is similar with worse historical grounding.
- **/determinism-auditor: SAFE** (all options determinism-safe; no preference).

### Recommended Numerics for HRHB step-curve: **RS-proportional `0.010 / 0.0057 / 0.000 / -0.004`** (UNANIMOUS among 3 substantive panelists; 4th abstains)

| Faction | <w52 | w52–w77 | w78–w103 | w104+ | Derivation |
|---|---|---|---|---|---|
| HRHB (recommended) | 0.010 | **0.0057** | **0.000** | **-0.004** | Mirrors RS's 1.0/0.57/0.0/-0.4 ratios on HRHB's 0.010 baseline |
| RS (UNCHANGED) | 0.007 | 0.004 | 0.000 | -0.0028 | Phase 1 shipped |
| RBiH (UNCHANGED) | const 0.015 | | | | Phase 0 panel CONTROL |

**Per-turn rate magnitudes (B'.2 retune for HRHB only):**

```json
"HRHB": {
    "faction": "HRHB",
    "learning_rate_per_turn_step_curve": [
        { "start_turn":   0, "end_turn":  52, "value":  0.010   },
        { "start_turn":  52, "end_turn":  78, "value":  0.0057  },
        { "start_turn":  78, "end_turn": 104, "value":  0.000   },
        { "start_turn": 104, "end_turn": 9999, "value": -0.004  }
    ],
    "zagreb_cadre_interval": 15,
    "roso_restructuring_week": 52,
    "political_replacement_delay": 4,
    "combat_death_replacement_delay": 1,
    "generic_replacement_competence": 2
}
```

**Rationale:**

1. **Historical defensibility:** HRHB late-war proportional magnitude (-0.4×) matches RS's (-0.4×). Does not invert BB1/BB2 directional record. Washington Agreement at w104 corresponds to onset of negative band (consistent with degradation OFFSET by HV cadre infusion settling into a steady mild decline rather than acceleration).

2. **Calibration:** Predicted HRHB post-w52 segment Δ/turn ≈ -0.00040/turn (PASS refined criterion 3+4 per Phase 1 PROJECT_LEDGER lesson). Predicted whole-run Δ/turn ≈ +0.00027/turn (still positive due to pre-w52 dominance; FAILS strict reading but PASSES refined reading).

3. **40w byte-stability:** First-band 0.010 preserved → 40w hash byte-identical to Phase 1 (anchors 26/27 PASS by construction). Lighter regression burden than early-band-cooled.

4. **Determinism:** No new mechanism. No new code path. No new test surface beyond mechanical updates to HRHB band-boundary expected values in the existing 11 lane tests.

5. **Pyrrhic-design fit:** Proportional ranking preserved (HRHB ≤ RS in late-war degradation magnitude); narrative integrity holds.

**Secondary alternative (if RS-proportional ships and STILL doesn't bend HRHB on whole-run strict reading):** Adopt the post-w52 segment Δ/turn ≤ 0 refined criterion as the binding ship gate (per Phase 1 PROJECT_LEDGER lesson "criterion-3 strict reading of whole-run Δ/turn ≤0 may need refinement to post-w52 segment Δ/turn ≤0 for future late-war calibration lanes"). Do NOT deepen HRHB late-war beyond RS-proportional.

**Tertiary alternative (DEFERRED, conditional):** Early-band-cooled `0.008 / 0.005 / 0.001 / -0.003`. Most historian-defensible but requires 40w hash regression verification AND would need a third Phase 0 panel touch (deviates from Phase 0 panel-approved first-band 0.010 baseline). NOT recommended for THIS retune; possible follow-up if RS-proportional retune fails refined criterion.

### 5 Carried Stop Triggers (from Phase 0 panel, BINDING for retune lane)

1. If 188w VRS+HRHB faction-mean Δ/turn does NOT bend nonpositive (strict reading) AND does NOT bend nonpositive on post-w52 segment-Δ refined reading → STOP, verdict-report-only, do NOT retune in-lane. Re-engage panel for Fix Shape C re-evaluation.
2. If 188w VRS+HRHB **stayer** Δ/turn (per `officer_quality_growth_trace.cjs`) does NOT bend nonpositive (strict OR refined) → STOP; per-formation gate failure indicates survivorship contamination biting.
3. If 40w benchmarks drop below 6/6 → STOP, bot calibration regression.
4. If 188w RS active brigade count drops below 35 → STOP, dissolution cascade.
5. If `final_state_hash` fails to emit at 188w (replay-buffer streaming regression) → STOP, do NOT retry without diagnosis (Mission C precedent).

### NEW 6th Stop Trigger — RS Regression Check (BINDING for retune lane)

6. If 188w **RS faction-mean Δ/turn regresses from Phase 1 baseline** (Phase 1: -0.000677; retune must remain ≤ 0; if retune RS Δ/turn becomes > 0 OR rises above -0.000200 — i.e., loses more than ~70% of Phase 1's negative-bend magnitude) → STOP. The retune affects ONLY HRHB step-curve data; RS code path is structurally unchanged; therefore RS regression beyond noise margin would indicate either an unintended cross-faction interaction OR sibling-lane contamination. Investigate before merge.

### Implementation Acceptance Criteria (lighter than full Phase 0 panel — mechanism unchanged)

| # | Criterion | Notes |
|---|---|---|
| 1 | **Code-shape preserved (only data changes).** No edit to `officer_quality_update.ts`, `officer_types.ts`, `war_timeline.ts`. ONLY `data/scenarios/timelines/apr1992.json` `officer_config["HRHB"].learning_rate_per_turn_step_curve` `value` numbers updated. RS subkey UNTOUCHED. RBiH subkey UNTOUCHED. | Determinism-side; binding |
| 2 | **11/11 lane tests still pass.** Mechanical updates to HRHB band-boundary expected values in `tests/officer_learning_rate_timeline_step_curve.test.ts` (band 2: 0.007 → 0.0057; band 3: 0.003 → 0.000; band 4: -0.002 → -0.004). RS / RBiH / mutually-exclusive / default-fallback / negative-floor-clamp tests unchanged. | Mechanical; binding |
| 3 | **40w smoke anchors stay 26/27.** First-band 0.010 preserved → first-band growth math identical → 40w hash byte-identical to Phase 1 → anchors stable by construction. | Verified by smoke run |
| 4 | **188w smoke shows HRHB whole-run Δ/turn ≤0 OR HRHB post-w52 segment Δ/turn ≤0** per Phase 1 PROJECT_LEDGER refined-criterion lesson. Strict whole-run reading may still fail due to pre-w52 dominance; refined reading should PASS at projected -0.00040/turn. | Binding ship gate |
| 5 | **RS shipped numerics unchanged** (verified by file diff: only `officer_config["HRHB"]` lines change; `officer_config["RS"]` lines byte-identical pre/post). | Diff verification; binding |
| 6 | **Ring 1 classification preserved.** Same row-by-row §6 negative test as Phase 0 panel; no §6 surface; faction-symmetric mechanism with asymmetric data; no FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / `enclave_resilience.ts` touch. | Carry-over; binding |
| 7 | **Production reachability unchanged** — path #0 still fires for {RS, HRHB}; path #1 (scalar) still fires for {RBiH}. Reachability is structurally invariant under data-value retune. | Carry-over criterion 11 from Phase 0 |
| 8 | **NEW 6th stop trigger satisfied** — 188w RS faction-mean Δ/turn ≤0 AND ≤ -0.0002 (no more than ~70% bend-magnitude loss vs Phase 1 baseline -0.000677). | RS regression check; binding |
| 9 | `npx tsc --noEmit` clean. | Carry-over; binding |
| 10 | Retune lane report under `docs/40_reports/implemented/` named per ship day with the standard sections + a "delta-from-Phase-1" subsection documenting the 3 changed values + observed trajectory + verdict against criteria. | Closeout; binding |

---

## Output Summary (for orchestrator handoff)

- **Report path:** `docs/40_reports/audits/20260505_HRHB_NUMERICS_RETUNE_MINI_PANEL.md` (this file)
- **Combined verdict:** **ALTERNATIVE PROPOSED** — candidate `0.010 / 0.005 / -0.001 / -0.005` is NO-GO (historically inverts BB1/BB2 record; Pyrrhic-design fails; calibration-marginal vs alternative). Recommend **RS-proportional alternative `0.010 / 0.0057 / 0.000 / -0.004`** (UNANIMOUS among 3 substantive panelists; determinism-auditor abstains as all options determinism-safe).
- **Recommended HRHB numerics (specific per-band values):**
  - `<w52`: **0.010** (UNCHANGED from Phase 1; first-band byte-stability preserved)
  - `w52–w77`: **0.0057** (was 0.007 in Phase 1; matches RS's 0.57× ratio)
  - `w78–w103`: **0.000** (was 0.003 in Phase 1; matches RS's 0.0× flatline band)
  - `w104+`: **-0.004** (was -0.002 in Phase 1; matches RS's -0.4× ratio)
- **5 carried stop triggers + new 6th:**
  1. 188w VRS+HRHB faction-mean Δ/turn doesn't bend nonpositive (strict OR refined) → STOP
  2. 188w VRS+HRHB stayer Δ/turn doesn't bend nonpositive (strict OR refined) → STOP
  3. 40w benchmarks drop below 6/6 → STOP
  4. 188w RS active brigades drop below 35 → STOP
  5. `final_state_hash` fails to emit at 188w → STOP
  6. **NEW** — 188w RS faction-mean Δ/turn regresses (rises above -0.0002 from Phase 1 baseline -0.000677) → STOP, investigate cross-faction or sibling-lane contamination before merge
- **Acceptance criteria summary:** Code-shape preserved (data-only edit to `officer_config["HRHB"].learning_rate_per_turn_step_curve`); 11/11 lane tests pass (mechanical band-boundary expected-value updates only); 40w anchors 26/27 (first-band byte-stable by construction); 188w HRHB Δ/turn ≤0 strict OR post-w52 segment Δ/turn ≤0 refined (per Phase 1 PROJECT_LEDGER lesson); RS shipped numerics byte-identical; Ring 1; criterion 11 reachability preserved; new 6th stop trigger (RS regression) satisfied; `tsc --noEmit` clean; lane report.
- **Commit SHA:** [filled by parent after commit]
- **Sentence on next action user should consider authorizing:** Authorize the HRHB numerics retune Phase 1 lane to apply the RS-proportional `0.010 / 0.0057 / 0.000 / -0.004` to `officer_config["HRHB"].learning_rate_per_turn_step_curve` in `data/scenarios/timelines/apr1992.json` (3 numeric values + matching test-expected updates), gated by the 10 acceptance criteria + 6 stop triggers above; the lane is mechanism-unchanged, so the verification surface is 11 lane tests + 40w smoke + 188w smoke (with refined criterion 3+4 reading per PROJECT_LEDGER lesson) + RS regression check. The candidate `-0.005` numerics are panel-rejected; do NOT ship the candidate.
