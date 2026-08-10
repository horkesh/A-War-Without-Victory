# Pyrrhic Scoring Redesign — make grade A reachable for good play

**Date:** 2026-08-10 · **Branch:** codex/master-roadmap-execution · **Status:** DESIGN BRIEF (for Pyrrhic scoring panel + owner sign-off)
**Owner directive (2026-08-10):** "A must be reachable — the scoring model needs a redesign, not just reference tuning."
**Canon gate:** VICTORY_AND_PYRRHIC_SCORING §3.5 (A0-A3 invariants) + SENSITIVE_HISTORY_DESIGN_GATE §6 bright line. Implementer ≠ reviewer.

## 1. Problem (measured)

Every faction scores `war_cost_index = 1.000` → grade cap **C**, regardless of play. Two stacked causes:

- **(a) Casualty over-production — FIXED (part 1, the decouple).** The sim recorded ~2.3× historical casualties (RBiH 355,933) because cumulative battle personnel-removals double-count reconstituted soldiers. The ledger/territory decouple (`casualty_ledger.ts` realism fraction, territory byte-flat) now records historical totals (~140k/95k/35k). Adopt-pending.
- **(b) Structural floor — the REAL redesign target.** `war_cost_index = 0.4·casualtyScore + 0.4·exhaustionScore + 0.2·durationScore`. For any faction that fought the full 188-week war, **exhaustionScore ≈ 0.88-0.98 and durationScore = 0.94 (188/200)**, so the index has a **floor of ~0.4·0.9 + 0.2·0.94 ≈ 0.55 before casualties are even counted**. Grade caps: `≥0.78→C, ≥0.60→B, ≥0.45→A`. Measured projection with realistic casualties + re-derived references: HRHB → B, RBiH/RS → C. **A (index < 0.45) is unreachable for any full-length campaign** — it would require a faction to end the war at low exhaustion *and* low casualties, which no participant in a 3.5-year total war achieves.

So even with realistic casualties and re-derived references, the exhaustion+duration terms cap the whole field at B/C. Reference tuning alone cannot open A (owner is correct).

## 2. Constraints (non-negotiable)

- **§6 bright line:** atrocity is NEVER rewarded. Any A must be UNREACHABLE once a condemnation flag fires (`authorized_cleansing_condemnation` / `genocide_condemnation`). The grade cap must respect the atrocity term, not just the classification overlay.
- **Negative-sum thesis:** A is NOT a conquest/victory grade. In this game A must mean *"you authored a less-catastrophic tragedy than the baseline you inherited"* — minimized the suffering within your control, ended the war sooner, avoided moral collapse. No faction "wins" the war; a faction can navigate it better or worse.
- **§3.5 A0-A3:** A0 monotonic in atrocity; A1 atrocity gain ≥ the C threshold; A2 references stay low (not fit to sim output); A3 no territory-normalization. A redesign must preserve or explicitly re-ratify these.
- **Determinism.** No wall-clock/RNG; per-faction, reproducible.

## 3. Options

### Option 1 — Reference re-derivation + re-weight (insufficient alone; a component)
Re-derive `casualties_full`/`exhaustion_full`/`duration_full_weeks` to realistic scales and lower the exhaustion+duration weights so realistic casualties dominate. **Verdict: the owner already ruled this out as the whole answer** — even at any canon-compliant reference the exhaustion floor keeps A closed. Keep the reference re-derivation as a *sub-component* of whichever option wins (the references must move to realistic scales regardless).

### Option 2 — Relative-to-counterfactual cost (RECOMMENDED spine)
Score cost **relative to a per-faction counterfactual baseline** — the historical/default outcome the president inherited — instead of against fixed absolute references. `cost_index = f( actual_cost / counterfactual_cost )`, clamped. A president whose war ends with **fewer casualties / less exhaustion / shorter than the counterfactual** scores *below* the baseline → **A**; worse than the counterfactual → C/F. This directly encodes "authorship of the tragedy": A = "you made it less bad than it historically was." The counterfactual baseline is already available — the **Ghost War capability** (`memory: ghost_war_capability`, the calibrated historical run as a live per-OSID/aggregate benchmark) supplies the per-faction historical cost. Naturally play-differentiated (no saturation — it's a ratio, not an absolute). §6: atrocity term still adds on top and caps A. **Open Q for panel:** does relative scoring violate A3 (territory-normalization)? — cost is casualty/exhaustion-based, not territory, so likely clean, but the panel must confirm. Does it violate A2 ("refs stay low")? — the counterfactual replaces fixed refs; A2 may need re-ratification/re-wording.

### Option 3 — Positive achievement axis (offsets cost; complements Option 2)
Add a positive axis (objectives held/achieved, population protected, war shortened) that can EARN grade *up* toward A, offsetting the cost penalty — but hard-capped by the §6 atrocity term (no achievement buys back an atrocity A). Risk: an "achievement" axis can drift toward a conquest/points game, against the thesis. Prefer as a *bounded modifier* on Option 2, not the spine.

## 4. Recommendation

**Option 2 (relative-to-counterfactual) as the spine, with the Option-1 reference re-derivation folded in and an optional bounded Option-3 modifier.** It is the only structure that (i) opens A for genuinely better-than-historical play, (ii) stays true to the negative-sum thesis (A = less-bad tragedy, not victory), (iii) is naturally play-differentiated without saturation, and (iv) has its counterfactual baseline already built (Ghost War). The §6 atrocity term rides on top and keeps A unreachable after any condemnation flag.

## 5. Open questions for the Pyrrhic scoring panel

1. **Canon (§3.5):** does relative-to-counterfactual scoring require amending A2 (references) and confirming A3 (no territory-normalization)? Does it preserve A0/A1 (atrocity monotonicity/dominance)?
2. **Ghost War as baseline:** is the calibrated historical run a legitimate, deterministic per-faction counterfactual for cost? Any circularity risk (baseline vs live run divergence)?
3. **§6:** confirm the atrocity term + condemnation flags still hard-cap A under the relative model (bright line intact).
4. **Thematic (game-design):** is "A = authored a less-bad tragedy than history" the right meaning of A? Should A even exist, or should the ceiling be B (pure negative-sum)? — the owner says A must be reachable; confirm the *meaning*.
5. **Historian:** are the per-faction historical counterfactual costs (casualties/exhaustion/duration) well-established enough to anchor the baseline?

**Panel seats:** game-designer (thematic) + canon/§6 owner-delegate (§3.5/§6) + systems/technical-architect (Ghost War wiring, determinism) + historian (counterfactual anchors) + red-team (bright-line + gaming the ratio). Unanimous GO = signature; BLOCK/split → owner.

## 6. Sequencing

1. **Adopt the decouple** (part 1) first — realistic casualties are the foundation for any scoring model (territory byte-flat, tester-GO). Independent of the redesign.
2. **Panel** on this brief → pick the model.
3. **Build** the chosen model flag-gated (default = current scoring → byte-identical historical verdict), measure the before→after grade table across the 5 archived strategies + historical baseline, owner sign-off (per the standing instruction), adopt.
