# Phase 2 canon-text DRAFT — exhaustion/scoring redesign (for panel sign-off)

**Status:** DRAFT for the 4-seat §6 panel's sign-off pass (implementer ≠ reviewer). The panel already returned UNANIMOUS GO on the redesign shape + conditions (2026-08-06); this is the sign-off on the actual TEXT before it lands in canon. Once all four seats approve (or approve-with-edits I fold in), these three pieces are committed to canon and the pending-review report deleted.

Incorporates every recorded condition: Engine/systems (§8 clause + determinism), Historian (units basis, 188 duration, atrocity refs low + citations), Calibration (numeric reachability bands, engine-health≠grade, historical-baseline move, exhaustion_full coupling), Red-team (ATROCITY_COST_GAIN ≥ 0.78 + unit test, never territory-normalize, atrocity-refs-low rationale, C-floor vs collapse split).

---

## PIECE 1 — `docs/10_canon/Engine_Invariants_v0_9_0.md` §8: new invariant appended after the existing five bullets

> **8.6 Asymptotic bounding, not truncation** (exhaustion/scoring redesign panel, 2026-08-06, unanimous GO).
>
> Any exhaustion quantity that this section mandates must increase under persisting conditions (brittle/cut corridors, static fronts, coercive control, sustained supply strain) must be bounded — where bounded at all — by a strictly-increasing, asymptotically-saturating function of its accumulated drivers, and never by a hard clamp that truncates growth to a constant while those driving conditions persist. Formally: while any mandated driver is active and the per-turn increment is positive, the exhaustion read must strictly increase turn-over-turn — it may approach a ceiling arbitrarily closely but must not flatline at it. A saturating consumer read of the form `CEILING·raw/(raw+K)`, or an asymptotic increment of the form `current + Δ·(1 − current/CEILING)`, satisfies this; a truncating `min(CEILING, current + Δ)` does not. A defensive numeric backstop (e.g. a residual `min(CEILING, …)`) is permitted ONLY where the asymptotic/bounding term provably keeps the value strictly below `CEILING` for every admissible driver value, so the backstop can never bind and can never truncate a real increase. All arithmetic on any bounded exhaustion read must use only IEEE-754 field operations (`+`, `−`, `×`, `÷`); transcendental functions (`exp`, `pow`, `log`, `tanh`) are prohibited — they are not correctly-rounded across V8 versions/platforms and would fork the save-state calibration hash. Monotonicity attaches to the persisted accumulator: it must never be decreased by any writer, and every consumer read of it must be a non-decreasing function of it.

---

## PIECE 2 — `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`: new §3.5 inserted after §3.4, before the `---`/§4

> ### 3.5 War-cost cap on faction grades (`war_cost_index` / `capGradeByCost`)
>
> The faction grade earned by the anchors (§3.2) is then **capped downward** by a war-cost index. This mechanism was previously undocumented in canon (`src/sim/negotiation/scoring.ts`); this section makes it canonical. The cost cap can only LOWER an earned grade, never raise it (`capGradeByCost`), and it is the single arithmetic guarantor of §6 Non-Goal #3 (atrocity never inverts to a better outcome).
>
> **The index.** `war_cost_index` ∈ [0, 1] is a positively-weighted sum of sub-scores — casualties, war duration, exhaustion, and an **atrocity term** (war crimes, refugees, civilian casualties) — each normalized against a fixed reference in `COST_REFERENCE` and clamped to [0, 1]. Higher index ⇒ costlier war ⇒ harder grade cap (`COST_GRADE_CAPS`; the highest cap threshold is 0.78 → grade C). It is a PURE function of `GameState`: it never writes sim state, uses only field arithmetic (no transcendental, no wall-clock/RNG), and iterates factions in `strictCompare` order.
>
> **Atrocity dominance (the bright line, §6 Non-Goal #3).** Three invariants MUST hold across any future reference re-derivation:
> - **A1 — `ATROCITY_COST_GAIN ≥ 0.78`** (the highest `COST_GRADE_CAPS` threshold). A saturated atrocity sub-score (1.0) alone must force `war_cost_index ≥ 0.78` from ANY base, including base = 0 — mass atrocity alone caps the grade at C irrespective of every other sub-score. A unit test pins this: *"saturated atrocity forces grade ≤ C regardless of base."* (Currently `ATROCITY_COST_GAIN = 0.85` ✓.)
> - **A2 — atrocity references stay far below historical magnitude.** `war_crimes_full` (3 events), `refugees_full` (50,000), `civilian_casualties_full` (5,000) are DELIBERATELY set 8–44× below real magnitude (real: ~97k war dead / ~2.2M displaced / Srebrenica ~8,372 adjudicated genocide — RDC *Bosnian Book of the Dead* 2007, UNHCR, ICTY *Prosecutor v. Krstić* IT-98-33). This is BY DESIGN so any significant atrocity saturates the term; it is the backstop that stops "cleansing territory" (large displacement, low discrete event count) slipping through a count-only grade anchor. These references MUST NOT be normalized toward historical scale — doing so weakens the bright line ~8×.
> - **A3 — `war_cost_index` is ABSOLUTE.** It MUST NEVER be normalized by territory, objectives, or anything gained. A cost-per-objective ratio is the `atrocity_efficiency` inversion the `RING_3_REFUSED_FLAGS` guard names (cheap cleansing → "efficient" → better outcome). This binds the Phase 5 verdict display ("what it cost vs what you carried out") as much as the arithmetic.
>
> **Grade reachability.** Under the CURRENT references, EVERY full-length (~188-week) campaign has `war_cost_index = 1.0` for all three factions regardless of strategy or exhaustion spread, because the casualties, duration, and exhaustion sub-scores each saturate independently (sim casualties ≫ `casualties_full`; run length 188 > `duration_full_weeks` 156; terminal exhaustion > `exhaustion_full` 8000). Measured on the adopted engine: `war_cost_index` = 1.0000 for RBiH/RS/HRHB (`docs/40_reports/20260806_TERMINAL_MIN_GAP_THRESHOLD_EVIDENCE.md`). This caps every full campaign at grade C and renders the atrocity term arithmetically INERT (added to an already-clamped 1.0). This is a KNOWN DEFECT under active redesign, NOT intended canon. Inert ≠ rewarded: the earned-grade war-crimes anchors and condemnation flags (§3.4) still fire, so atrocity is never rewarded — but the cost cap fails to let atrocity be grade-decisive, which §6 Non-Goal #3 intends. After the reference re-derivation, grade reachability must be stated as explicit run-condition bands: a clean/short war keeps its earned grade; a full-length historical-cost war caps at the tier chosen in the re-derivation; A/B become reachable only when casualties, duration, AND exhaustion each stay below their re-derived references.
>
> **Reference basis (units).** `casualties_full` is compared against the sum KIA+WIA+MIA and MUST be set on that same combined basis (historical analogues ≈ 120–155k / 85–105k / 30–40k for ARBiH / VRS / HVO), NOT against KIA-only figures (~31k / 21k / 8k, RDC basis) — mismatching the basis reproduces the saturation defect. `duration_full_weeks` anchors on the ~188-week April 1992 → Dayton length (not 182); it may be scaled above the real length by an explicit severity factor, which is a scoring scale, not a claim the war lasted longer. `exhaustion_full` is COUPLED to the exhaustion accumulator's terminal band (Engine Invariants §8.6) and must be re-derived whenever that band changes — it is NOT independently fixed.
>
> **Engine-health vs grades (do not conflate).** De-saturating the exhaustion accumulator (Engine Invariants §8.6) is an ENGINE-HEALTH fix — it removes the cap-pin and restores faction differentiation in the exhaustion curve. It does NOT by itself unpin grades: grade differentiation is owned ENTIRELY by the `COST_REFERENCE` re-derivation above. These are distinct claims; conflating them sent two prior fix cycles chasing the wrong lever.
>
> **Historical baseline.** Re-deriving `casualties_full` / `duration_full_weeks` changes the historical run's own `war_cost_index`, so the historical baseline's grade moves off its current all-C. This is intended; the new historical-baseline grade must be stated explicitly when the references are chosen.
>
> **Grade floor vs collapse.** The war-cost cap bottoms at grade C. Pushing an outcome BELOW C (toward failure/collapse) is the job of condemnation flags (§3.4) / `classifyOutcome`, not the cost cap. Neither subsystem is assumed to cover the other.
>
> Any change to `COST_REFERENCE`, `COST_GRADE_CAPS`, or invariants A1–A3 must go through the §8 sign-off structure.

---

## PIECE 3 — `docs/10_canon/FORAWWV.md` §IX: promote H1.10 from pending (§IX.4) to canon (§IX.6)

**In §IX.4**, strike the pending line 151 (`- H1.10: If exhaustion bounds/units are formalized…`) and note it promoted, matching the existing H1.8/H1.9 treatment.

**In §IX.6** (owner-promoted canon), add:

> - **H1.10 — Exhaustion bounds and units are formalized (promoted 2026-08-06, exhaustion/scoring redesign panel, unanimous GO).** Exhaustion accumulates on a 0–10000 scale (rescaled 100 → 10000 on 2026-05-22). It is monotonic/irreversible (Engine Invariants §8) and must be asymptotically bounded, never hard-clamped (Engine Invariants §8.6). Every downstream consumer keyed to this scale — combat tempo, Washington Agreement, bilateral ceasefire, Operation Storm, formation fatigue, command friction, and the `war_cost_index` scoring consumer — reads the same 0–10000 units; any change to the scale or bound requires re-deriving those consumers in lockstep (a non-linear re-derivation, NOT a proportional rescale). The scoring consumer's bounds and downstream assumptions are documented in VICTORY_AND_PYRRHIC_SCORING §3.5.

---

## Sign-off ask to the 4 seats

Each seat: does the text for YOUR condition(s) faithfully capture what you required? Reply **APPROVE** or **APPROVE-WITH-EDIT** (give the exact wording change). Engine/systems: PIECE 1 + the §3.5 determinism/atrocity-dominance framing. Historian: §3.5 "Reference basis (units)" + A2 magnitudes/citations. Calibration: §3.5 "Grade reachability" bands + "Engine-health vs grades" + "Historical baseline" + exhaustion_full coupling. Red-team: A1/A2/A3 + "Grade floor vs collapse". Unanimous APPROVE (with any edits folded in) → land in canon.
