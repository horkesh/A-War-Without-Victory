# Exhaustion & Scoring Redesign — Implementation Plan

**Date:** 2026-08-06
**Status:** PLAN — ready for phase-by-phase execution, gated as described below
**Overseer:** Orchestrator
**Architect:** Makes decisions on curve-shape/reference-value specifics inside the boundaries this plan sets; decisions flagged for user review before Phase 3/4 numbers are finalized
**Prerequisites:** `docs/40_reports/20260806_EXHAUSTION_SCORING_PYRRHIC_BRAINSTORM.md` (17-specialist Pyrrhic panel synthesis this plan implements) — read that document for the full evidence base; this plan does not re-derive it.

**Sacred-rule reminders specific to this plan**: one calibration-moving change per run (Phase 0 items ship as separate serial PRs unless explicitly bundled below); 188w validates combat-behavior changes, 40w GO is a documented false-green for this exact subsystem (Zvornik/COMBAT-P14 precedent, independently re-confirmed by three specialists in the brainstorm); canon edits require Pyrrhic-panel sign-off, unanimous GO = signature, implementer ≠ reviewer.

---

## Phase ordering rationale (read before executing out of order)

1. **Phase 0 first** — four independent production bugs, no design/canon decision required, each restores previously-intended-but-broken behavior. Safe to schedule immediately, serially.
2. **Phase 1 second** — build the regression gate *before* touching the redesign, so the fix is measured against a documented, committed baseline rather than a claim. This is the single change that would have caught both prior "fix" cycles.
3. **Phase 2 third** — canon governance. Per Canon Compliance Reviewer's explicit sequencing ("panel first, then canon text, then numbers — the reverse has been tried twice and failed twice"), no numeric decision in Phase 3 or 4 ships before this lands.
4. **Phase 3 and Phase 4 are empirically decoupled** (verified 2026-08-06 by re-scoring the four RBiH saves offline — see brainstorm doc Part 8 addendum): Phase 3 (scoring references) is a pure-function, zero-engine-risk change that can ship independently of Phase 4 (exhaustion accumulator redesign). They do not need to be sequenced relative to each other, only both need to follow Phase 2.
5. **Phase 5** (verdict UI) can ship any time after Phase 3, ideally bundled with it since it explains the same mechanism to the player.

---

## Phase 0: Independent bug fixes (no canon/design decision required)

**Assigned to:** Gameplay Programmer + Systems Programmer, QA Engineer reviews.

Each of these restores behavior the 2026-05-22 rescale already intended but missed — not a new design. Ship as separate, serial PRs (each is independently a "one change" for calibration purposes); do not bundle.

- [ ] **Fix the unclamped, faction-agnostic exhaustion writer.** `src/scenario/baseline_ops_scheduler.ts:52-60` (`applyBaselineOpsExhaustion`). Currently writes an unclamped, faction-uniform delta to both `political.war_exhaustion` and `factions[].profile.exhaustion` *after* the pipeline's own clamp — this is what actually forces the byte-identical terminal value across factions, independent of the clamp itself. Decide: clamp it to match the pipeline's ceiling, or remove the write to `political.war_exhaustion` entirely if it's not load-bearing for its intended purpose (verify callers first). Found independently by Systems Programmer, Technical Architect, QA Engineer.
- [ ] **Fix the command-friction feedback loop.** `src/sim/combat/command_friction.ts`. `FRICTION_PER_EXHAUSTION = 0.01` was authored for the pre-rescale 0–100 exhaustion scale and missed in the 2026-05-22 100x sweep; on the current 0–10000 scale it pins friction at `MAX_MULTIPLIER = 10` within ~5-10 turns for every faction, which then feeds back into the exhaustion accumulator and compresses RBiH's ~4:1 static-front differentiation advantage over HRHB down to ~1:1. Rescale to `0.0001` (Gameplay Programmer's proposed value) to restore its originally-authored contribution on the new scale. **This is combat-tempo-adjacent — 188w validation required, not 40w.** Found independently by Gameplay Programmer, Gap-Finder.
- [ ] **Fix three more gates broken by the same missed rescale sweep** (found solely by Gap-Finder — required reading across files no single specialist owned):
  - `src/sim/combat/operation_storm.ts` — `STORM_COMBINED_EXHAUSTION = 60` should be `6000` (currently satisfied at turn ~1; Operation Storm's exhaustion precondition is a dead gate).
  - `src/state/formation_fatigue.ts:254` — `EXHAUSTION_FATIGUE_STRAIN_THRESHOLD = 80` should be `8000` (currently always-true from turn 1).
  - `src/sim/political/political_directive_producer.ts` — `B1_HIGH_EXHAUSTION_THRESHOLD = 500` needs re-deriving against the 0–10000 scale (currently crossed ~turn 5; every faction spends ~183 of 188 turns in a directive state meant to be rare).
  - Also verify `victory_conditions.max_exhaustion` scenario-JSON fields aren't still authored on the old 0–100 scale (Gap-Finder flagged as suspect, not confirmed).
  - **All three/four are combat- or political-behavior-adjacent — 188w validation required.**
- [ ] **Fix two Engine Invariants §8 monotonicity exposures.** `src/sim/early_war/control_strain.ts:145` and `src/scenario/baseline_ops_scheduler.ts:60` both floor `factions[].profile.exhaustion` at `Math.max(0, ...)` instead of `Math.max(current, ...)` — currently safe (no observed negative delta) but unguarded against future retuning. Cheap, isolated, low-risk. Add a property test sweeping the modifier inputs across their declared ranges asserting `next >= current` (Determinism Auditor's specific recommendation), covering both this and the already-guarded enclave-reduction term as a regression backstop.
- [ ] **Rename `factions[].profile.exhaustion` → `factions[].profile.pressure_work`.** Byte-identical, zero behavior change — it accumulates front-edge pressure "work," not war-weariness, and the current name has already caused one real conflation bug (`victory_conditions.ts:73`'s `??` fallback silently swaps a ~4-order-of-magnitude scale depending on which surface happens to be populated). Fix that `??` fallback in the same PR — decide explicitly which surface `victory_conditions.ts` should read, don't leave it ambiguous.
- [ ] **Rewrite `tests/free_war_verdict_cost_floor.test.ts:86-91`.** It currently asserts `computeWarCostIndex(state, 'RS') ≈ 1` as *correct* behavior — this is the test that let both prior "fixes" ship green. Replace with an assertion that the index is *not* pinned at 1.0 for a state with moderate (non-saturated) inputs, and add a second test at genuinely saturated inputs confirming the cap still applies there. Do this in the same PR as whichever Phase 0 fix it's adjacent to, not deferred.

**Gate:** each fix passes `tsc --noEmit` + full `vitest` + its own 188w run (where flagged) with `matched_osids` diffed explicitly against the current floor (630, not the stale 649 — confirmed by Scenario Harness Engineer) before merge.

→ /simplify → commit (each item, separately)

---

## Phase 1: Build the regression gate BEFORE the redesign

**Assigned to:** QA Engineer + Scenario Harness Engineer.

Both specialists independently insisted this land first, not after — the reviewable artifact is what distinguishes this cycle from the two that already failed silently.

- [x] **Gate built — folded into `tools/engine_health_gate.cjs`** (Scenario Harness Engineer's preferred point; same run-directory ingestion). Reads the per-faction per-week `exhaustion` series from `weekly_report.jsonl` (no new instrumentation). Metrics **1-3 SHIPPED** (advisory, in `.measured.exhaustion_curve`), CAP=10000:
  1. `first_saturation_week` (any faction ≥0.99·cap) — floor ≥150.
  2. `dead_weeks_pct` (% weeks where cross-faction spread <1% of cap) — ceiling ≤15%. **Keystone.**
  3. `terminal_min_gap_pct` (smallest pairwise gap at final week, % of cap) — floor ≥5%.
  - [ ] **Metrics 4-5 = follow-up** (`cost_index_saturated_components_max` ≤1; `war_cost_index_spread` ≥0.10) — need `computeWarCostIndex` (scoring.ts) wired into the .cjs gate.
- [x] **Ran it + committed the documented FAILING baseline** → `data/calibration/exhaustion_curve_baseline.json` (2026-08-06, run n150). Metrics 1-3 all FAIL exactly as predicted: **first_saturation_week 50** (<150), **dead_weeks_pct 57.4%** (>15%, keystone), **terminal_min_gap_pct 0** — all three factions pinned at exactly 10000 at week 188 (zero differentiation). This is the byte-identical-terminal saturation that makes COST_GRADE_CAPS cap every campaign at C. Advisory (reported, non-fatal) until Phases 0/3/4 fix it, then promote to gated.
- [ ] **Add Tier-1 unit invariants to the fast vitest slice** (QA Engineer's 1a/1b): (a) assert the exhaustion clamp holds across *all* writers, not just `updateExhaustion` — this is the permanent regression guard against Phase 0's Surface-C bug recurring under a future third writer; (b) assert per-turn deltas differ across factions with materially different inputs (the invariant `applyBaselineOpsExhaustion` currently violates by construction).

**Gate:** gate script runs clean against at least one existing 188w run directory; baseline JSON committed to `data/calibration/` alongside the existing `engine_health_thresholds.json` pattern.

→ /simplify → commit

---

## Phase 2: Canon governance (required before Phase 3/4 numbers are chosen)

**Assigned to:** Orchestrator convenes; Canon Compliance Reviewer drafts; full panel signs off.

Per Canon Compliance Reviewer's explicit finding: this is §6-adjacent (the atrocity bright-line term is currently arithmetically inert at saturation — confirmed independently by War-or-Game, Game Designer, and Canon Compliance Reviewer) and canon-silent (the entire cost-cap mechanism appears nowhere in `VICTORY_AND_PYRRHIC_SCORING.md`). This is not a light numeric-tuning tier — "just retuning references inside existing canon intent" is explicitly rejected as a framing, since canon states no intent for the current values to retune inside.

- [ ] **Convene the panel**: Historian + scenario-tester/calibration + Engine/systems + Red-team, per CLAUDE.md's standing §6-adjacent process. Unanimous GO = signature; BLOCK/split verdict/bright-line uncertainty escalates to the owner.
- [ ] **Panel confirms or amends the redesign shape** for Phase 4 (see below) — unbounded monotonic raw accumulator + pure-arithmetic saturating-curve consumer read, converged on independently by four specialists (Systems Programmer, Technical Architect, Gameplay Programmer, Determinism Auditor). Panel's job is to bless or redirect this shape, not re-derive it from scratch.
- [ ] **Panel explicitly re-establishes atrocity dominance** as a stated precondition on any Phase 3/4 work — confirm the redesigned cost index cannot again arithmetically absorb the atrocity term at saturation, and confirm neither the casualty nor duration reference (Phase 3) gets normalized in a way that weakens §6 Non-Goal #3.
- [ ] **Write new canon text**, in this order (numbers only chosen after this lands):
  - New §3.5 in `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md` — documents `war_cost_index`/`capGradeByCost` explicitly (currently entirely absent from canon), states which grades remain reachable and under what conditions.
  - New clause in `docs/10_canon/Engine_Invariants_v0_9_0.md` §8 — rules out hard clamps for any value §8 mandates must increase under persisting conditions; requires asymptotic/strictly-increasing bounding instead.
  - Promote `docs/10_canon/FORAWWV.md` §IX.4 item **H1.10** ("if exhaustion bounds/units are formalized, document the bounds and downstream assumptions") — this item was explicitly left un-promoted in the 2026-06-07 batch; both the original clamp and the 2026-05-22 rescale shipped against this still-open question. Closing it is part of this fix, not a side effect.
- [ ] **Confirm the §6 `RING_3_REFUSED_FLAGS` guard boundary** (`src/sim/codex/dynamic_section_builder.ts`, `pyrrhic_score_inverted`/`atrocity_efficiency`, found by Gap-Finder) — state explicitly to whoever implements Phase 3/4 that no scoring framing resembling "efficiency" or "cost-per-objective" is in scope; this guard already exists and already throws.

**Gate:** written, panel-signed canon text exists for all three items above before any PR in Phase 3 or Phase 4 opens.

→ commit canon docs (no /simplify — canon prose, not code)

---

## Phase 3: Scoring reference redesign (pure function, zero engine risk — verified separable from Phase 4)

> **HARD GATE — §6 atrocity-liveness obligation RELOCATED here (recorded 2026-08-06).** The Pyrrhic panel that ratified demoting the exhaustion-curve `terminal_min_gap_pct` metric to advisory (unanimous GO-WITH-CONDITION; game-design + canon/§6 + systems) did so **on the explicit condition** that the §6 atrocity-never-rewarded guarantee is carried forward as a binding Phase-3 obligation, not dropped. Evidence (`docs/40_reports/20260806_TERMINAL_MIN_GAP_THRESHOLD_EVIDENCE.md`): on the adopted engine the atrocity term moves `war_cost_index` by **0.0000** because casualties/duration references saturate the base to 1.0 — the term is *inert* (not rewarded, but not punishing either). This is NOT a regression (it was already inert pre-lane), but Phase 3 MUST restore liveness: the three `COST_REFERENCE` re-derivations below must produce a full-campaign `war_cost_index` that is **not clamped to 1.0**, so the atrocity penalty can once again MOVE the grade. Canon-seat verdict: without this recorded as a hard gate, the demotion would have been BLOCKED. Do not close R6/ship 1.0 with the atrocity term still inert at full campaign length.
>
> **Tracked follow-up (Red-team, out-of-scope for the scoring change — do NOT gate Phase 3 on it):** the war-cost cap bottoms at grade C; pushing a saturated-atrocity faction BELOW C (to failure/collapse) relies on condemnation flags in `rupture_consequences` / `classifyOutcome`. Add an invariant + test THERE (not in scoring.ts): **"saturated atrocity sub-score ⇒ at least one condemnation flag fires,"** so the C-to-collapse handoff is guaranteed rather than assumed. Canon records the seam in VICTORY_AND_PYRRHIC_SCORING §3.5 "Grade floor vs collapse".

**Assigned to:** Gameplay Programmer implements; Canon Compliance Reviewer + Game Designer + War-or-Game review against Phase 2's canon text.

Empirically confirmed 2026-08-06 (re-scoring the four RBiH saves offline, zero engine risk): fixing any *one* of the three `COST_REFERENCE` values alone leaves every strategy capped at C. All three must move together in one PR — this is the one exception to "one change per run" the panel should explicitly bless, since it's a single indivisible scoring-layer change, not three separate calibration-moving changes (scoring never writes sim state, per `scoring.ts`'s own header contract).

- [ ] **Re-derive `COST_REFERENCE.casualties_full`** from `data/reference/historical_baseline.json`'s already-committed per-faction `military_killed` figures, correcting for the KIA-share units mismatch Gameplay Programmer identified (the code sums KIA+WIA+MIA against a reference apparently set for KIA-only magnitude — roughly a 4.5x error, matching the observed overshoot). Per-faction, not a single shared constant, per the same `historical_baseline.json` structure.
- [ ] **Re-derive `COST_REFERENCE.duration_full_weeks`** from the same file's `war_duration_weeks: 182`, scaled by an explicit severity factor chosen in Phase 2, so a historical-length campaign does not saturate this sub-score by construction (currently `156` is *below* the canonical ~188-week campaign length, guaranteeing saturation for any full run regardless of player behavior).
- [ ] **Re-derive `COST_REFERENCE.exhaustion_full`** — coordinate with Phase 4's timeline. If Phase 4 hasn't landed yet, this reference should be provisional (e.g. widened proportionally to reduce saturation under the *current* accumulator) and explicitly re-derived again once Phase 4's curve shape is final — do not treat this as a one-time-only edit.
- [ ] **Do NOT touch the atrocity term's references** (`war_crimes_full`, `refugees_full`, `civilian_casualties_full`) — these are deliberately set below real historical magnitude specifically so atrocity dominates the cap; normalizing them to historical scale would weaken the bright line by roughly 8x (multiple specialists' explicit warning).
- [ ] **Verify via offline re-scoring** of the four already-collected RBiH saves (`baseline_historical`, `maximal_activist`, `faithful_activist`, `lever_isolated`) plus the RS playthrough saves, before merging — confirm the new references produce a genuinely differentiated grade distribution across strategies (target: at least 2 distinct letter grades among the existing five-strategy set, per QA Engineer's proposed acceptance criterion, understood as necessary-not-sufficient alongside the continuous `war_cost_index_spread` metric from Phase 1).
- [ ] **Rewrite the verdict description string** at `scoring.ts:640-644` and any place that renders it, once the new references are chosen, so the "capped by war cost" language reflects a genuinely-informative index rather than the current always-1.00 constant.

**Gate:** Phase 1's gate metrics 4 and 5 (`cost_index_saturated_components_max`, `war_cost_index_spread`) pass on offline re-scored archived saves. `historical_fit`/`control_delta` byte-identical at all horizons (scoring never writes state — this should be trivially true, verify it anyway).

→ /simplify → commit

---

## Phase 4: Exhaustion accumulator redesign (engine-level, higher risk, 188w-gated)

**Assigned to:** Systems Programmer + Gameplay Programmer implement; Determinism Auditor reviews the curve math specifically; QA Engineer + Scenario Harness Engineer own verification.

- [ ] **Replace the clamped accumulator with an unbounded raw accumulator + derived saturating-curve read.** Keep every existing driver term (static-front count, supply pressure, friction, legitimacy, patron/external modifier, Sarajevo siege extra, enclave resilience) exactly as-is — this changes the *shape* of accumulation, not the drivers, per Engine Invariants §8 bullets 2/3's mandate that those specific drivers govern exhaustion. Formula (converged on by 4 independent specialists): `level = CEILING * raw / (raw + K)` — rational/hyperbolic form only. **Do not use `Math.exp`, `Math.pow`, `Math.log`, or `Math.tanh`** — not IEEE-754-guaranteed bit-identical across V8 versions/platforms, and this project hashes full save state as its calibration floor (Determinism Auditor's explicit, load-bearing constraint, independently seconded by Technical Architect and Gameplay Programmer).
- [ ] **Choose `K`** (the curve's half-saturation point) anchored to an already-owner-ratified semantic rather than a fresh magic number — Technical Architect's specific suggestion: tie it to the `collapsing` band floor already ratified in `war_weariness_bands.ts` (currently 85 on the 0–100 read scale), so the choice is auditable against existing canon rather than invented fresh. Confirm in Phase 2 if not already covered there.
- [ ] **Resolve the Determinism Auditor's open dissent before building on top of the current formula.** The *original* (pre-2026-05-22) cross-faction convergence to a byte-identical value has two live candidate mechanisms in the code (a fallback branch broadcasting one scalar to all factions when `hasLiveSectorFrontlineTruth` is false, at `exhaustion.ts:71-76`; or the per-turn delta clip applying before any per-faction modifier, at `exhaustion.ts:87`) that the 2026-05-22 forensics memo did not distinguish between. Add the one-turn instrumented diagnostic Determinism Auditor specified (log `staticFrontCountByFaction` per faction per turn) to determine which, so the redesign doesn't unknowingly inherit the same defect in a new shape.
- [ ] **Re-derive every downstream gate against the new curve — not a linear rescale.** The curve is non-linear, so proportional rescaling (the exact mistake made twice already) is wrong here. Full list, cross-referenced from Gap-Finder's consumer audit: combat-tempo thresholds (`combat_math.ts`, currently 3000/8000), Washington Agreement (`washington_agreement.ts`, `WASH_COMBINED_EXHAUSTION`), bilateral ceasefire (`bilateral_ceasefire.ts`, both faction thresholds), Operation Storm (fixed in Phase 0, re-verify against new curve), formation fatigue strain (fixed in Phase 0, re-verify), B1 political directive threshold (fixed in Phase 0, re-verify), Phase 3C collapse-gating thresholds (`phase3c_exhaustion_collapse_gating.ts`, currently 70/70/65 against the `/100` read — **do not enable the Phase 3C flag as part of this phase**, only re-derive its thresholds so it's *ready* to enable later without re-tuning twice), `command_friction.ts` (already rescaled in Phase 0, re-verify against the new curve specifically), `strategic_dimensions.ts` internal-cohesion penalty (`/300` divisor, found by Gap-Finder to double-count exhaustion into both the composite score and the earned grade anchors — decide explicitly whether this double-counting is intended and adjust if not), `political_personality.ts` (`/600`), `commander/plan.ts` (`/600`), UI read-models (`warWeariness.ts`, `GameStateAdapter.ts`, `warWearinessChronicle.ts` — all currently hardcode the 0–10000/÷100 scale with no test coverage on the scale assumption itself).
- [ ] **Decide the fate of `corps_exhaustion`** (the third, previously-unbriefed surface found by Gap-Finder, `commander_state.ts`/`corps_operation_readiness.ts`, gates `MAX_EXHAUSTION_FOR_OPERATION = 30`). If out of scope for this phase, state that explicitly in the PR — a redesign that only touches the two originally-briefed surfaces will not change corps-level operational behavior at all, and that should be a documented decision, not an oversight.
- [ ] **Save migration.** The new `raw`/`work` field cannot be back-derived losslessly from the existing clamped value for in-flight saves — migration must seed it from the inverse of the chosen curve applied to the existing value, with a round-trip test against a real committed old save.
- [ ] **Measure Washington Agreement and bilateral-ceasefire fire-week before/after, explicitly, per faction.** QA Engineer's specific, non-negotiable sign-off condition — not "did it still fire," the actual week number. This is the single most likely place a well-intentioned exhaustion fix silently breaks the Federation-formation timeline and cascades into a catastrophic territory-floor loss.

**Gate (all required, per QA Engineer's stated BLOCK conditions):**
- Phase 1's gate, run at 188w, all five metrics green (or a documented, panel-approved exception).
- 188w run, not 40w — `npm run engine:health:gate` plus `matched_osids` diffed explicitly against the 630 floor.
- Washington Agreement / bilateral ceasefire fire-week diff attached to the PR.
- Full 188-point exhaustion trajectory per faction, per the four already-established strategy configs plus the RS baseline, attached to the PR as data — not a summary claim.
- §6 bright-line check: Srebrenica/Žepa still fall on canon timing, Goražde/Bihać/Sarajevo/Teočak still hold, per the standing §6 invariant suite.

→ /simplify → commit

---

## Phase 5: Verdict presentation (pure UI, zero calibration risk — can ship any time after Phase 3)

**Assigned to:** UI/UX Developer implements; Narrative Designer drafts copy; Architect reviews layout.

- [ ] **Stop displaying `pyrrhic_score` as the sole hero number with the letter grade subordinate.** Restructure per Architect's proposal (or equivalent reviewed by the same lens): named, co-equal axes — what it cost (the cap, now genuinely informative post-Phase-3), what you carried out of it (the composite), how it compares to history (grade/outcome class).
- [ ] **Surface "earned grade" vs "capped grade" explicitly** when they differ (Narrative Designer's specific, cheap, high-clarity proposal — the data already exists in the description string, this is a display change only).
- [ ] **Surface the cost trajectory during play**, not only at the verdict — warroom desk read-out, per the already-accepted Presidential Command Surface design (`docs/plans/2026-06-01-presidential-command-surface-design.md`). Lowest-risk, highest-leverage single change per two independent specialists (Architect, Modern Wargame Expert).
- [ ] **Add a one-time, dated, in-fiction dispatch** at the moment `war_cost_index` crosses the "hollow" (0.78, or Phase 2/3's redefined equivalent) threshold, per Narrative Designer's drafted framing — converts a silent state change into an authored story beat.
- [ ] **Historian sign-off required** on any specific historical claims used in the above copy (patron-fatigue dates, casualty figures) — Narrative Designer explicitly declined to ground these without Historian review.

**Gate:** no calibration exposure by construction (display-only); standard UI/UX review + Playwright visual verification.

→ /simplify → commit

---

## Protocol Enforcement

- [ ] Orchestrator oversees all phases; does not hand-implement directly.
- [ ] Architect decisions (curve `K` value, severity-factor choice, whether to touch `corps_exhaustion`) flagged for user review before Phase 3/4 numbers are finalized — not silently applied.
- [ ] Napkin read at start of each session touching this plan, updated during work.
- [ ] Ledger entry appended after each phase completes (behavioral/output change → `docs/PROJECT_LEDGER.md`; canon text → also `docs/PROJECT_LEDGER_KNOWLEDGE.md`).
- [ ] Life lessons scanned before each phase; flag if about to violate `feedback_188w_validate_combat_changes_before_merge` or `feedback_calibrate_a_healthy_engine_not_the_floor`.
- [ ] `tsc --noEmit` + full `vitest` (not a slice) after every phase, per the smoke-test triad.
- [ ] Version numbering checked; bump `package.json` if a phase completes a tracked milestone.

## Completion Checklist

- [ ] Implementation report in `docs/40_reports/implemented/` per phase (or one consolidated report if phases land close together).
- [ ] Canon docs updated: `VICTORY_AND_PYRRHIC_SCORING.md` §3.5, `Engine_Invariants_v0_9_0.md` §8 clause, `FORAWWV.md` H1.10 promotion (Phase 2).
- [ ] `docs/40_reports/CALIBRATION_MASTER.md` floor re-blessed after Phase 3 and again after Phase 4 (two separate re-floors expected, since they're empirically decoupled).
- [ ] `docs/plans/MASTER_ROADMAP.md` R6 checklist items (the two already-open exhaustion/scoring items this plan implements) marked closed with a pointer to this plan.
- [ ] `PROJECT_LEDGER.md` entries appended per phase.
- [ ] Napkin updated; this plan's backlog items removed once shipped.
- [ ] Memory updated: the four newly-found production bugs, the empirical Phase-3/4 decoupling finding, and the final chosen curve shape should get topic-file entries once implemented (not before — memory records what happened, not what's planned).
- [ ] `package.json` version bumped if this closes a tracked roadmap milestone.

---

## Success Criteria

- [ ] All five Phase-1 gate metrics green at 188w, for both RBiH and RS, across at least the five-strategy battery already used in the brainstorm's evidence base.
- [ ] At least 2 distinct letter grades reachable across that five-strategy battery on the same faction (necessary-not-sufficient, alongside the continuous `war_cost_index_spread` metric).
- [ ] Washington Agreement and bilateral-ceasefire fire-weeks within an explicitly-approved tolerance of their pre-fix values (or a documented, deliberate, panel-approved shift).
- [ ] §6 bright-line suite green: atrocity term demonstrably still able to move the grade at saturated cost levels (this is the one criterion that most directly answers why this work was prioritized).
- [ ] `matched_osids` floor re-blessed and documented (not silently re-used from a stale value).
- [ ] `tsc --noEmit` clean, full `vitest` green, `desktop:map:build` clean — smoke-test triad — at the end of every phase.
